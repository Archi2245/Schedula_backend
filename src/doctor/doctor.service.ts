import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Not } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { UpdateScheduleTypeDto } from './dto/update-schedule-type.dto';
import { AppointmentsService } from '../appointments/appointments.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { TimeSlot } from 'src/entities/time-slot.entity';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,

    private appointmentsService: AppointmentsService,

    @InjectRepository(TimeSlot)
    private slotRepo: Repository<TimeSlot>,

  ) {}

  async findAll(search?: string): Promise<Doctor[]> {
    if (search) {
      return this.doctorRepository.find({
        where: [
          { name: ILike(`%${search}%`) },
          { specialization: ILike(`%${search}%`) },
        ],
        relations: ['user'],
      });
    }
    return this.doctorRepository.find({ relations: ['user'] });
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({
      where: { doctor_id: id },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  async updateScheduleType(
    doctorId: number,
    dto: UpdateScheduleTypeDto,
    requestingUserId: number,
  ) {
    const doctor = await this.findOne(doctorId);

    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only update your own schedule type');
    }

    doctor.schedule_type = dto.schedule_type;
    await this.doctorRepository.save(doctor);

    return {
      message: 'Schedule type updated successfully',
      doctor_id: doctor.doctor_id,
      schedule_type: doctor.schedule_type,
    };
  }

  // ✅ FIXED: Get doctor's own slots
  async getDoctorSlots(doctorId: number, query: SlotQueryDto) {
    const { page = 1, limit = 10, date, session, status } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
    };

    if (date) {
      whereConditions.date = date;
    }

    if (session) {
      whereConditions.session = session;
    }

    if (status) {
      whereConditions.slot_status = status;
    }

    const [slots, total] = await this.availabilityRepo.findAndCount({
      where: whereConditions,
      relations: ['doctor'],
      order: { date: 'ASC', consulting_start_time: 'ASC' },
      skip,
      take: limit,
    });

    return {
      slots,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ✅ FIXED: Get available slots for patients
  async getAvailableSlotsForPatients(doctorId: number, query: SlotQueryDto) {
    const { date, session } = query;
    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
      slot_status: 'active',
      is_fully_booked: false,
    };

    if (date) {
      whereConditions.date = date;
    }

    if (session) {
      whereConditions.session = session;
    }

    const slots = await this.availabilityRepo.find({
      where: whereConditions,
      relations: ['doctor'],
      order: { date: 'ASC', consulting_start_time: 'ASC' },
    });

    // Filter slots where booking window is open
    const availableSlots = slots.filter(slot => slot.isBookingWindowOpen());

    return {
      doctor_id: doctorId,
      available_slots: availableSlots.map(slot => ({
        slot_id: slot.id,
        date: slot.date,
        session: slot.session,
        consulting_start_time: slot.consulting_start_time,
        consulting_end_time: slot.consulting_end_time,
        available_spots: slot.getAvailableSpots(),
        total_spots: slot.patients_per_slot,
        is_fully_booked: slot.is_fully_booked,
        reporting_times: slot.getReportingTimes(),
        booking_closes_at: slot.booking_end_time,
      })),
    };
  }

  // ✅ FIXED: Update slot
  async updateSlot(
    doctorId: number,
    slotId: number,
    dto: UpdateSlotDto,
    requestingUserId: number,
  ) {
    const doctor = await this.findOne(doctorId);
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only update your own slots');
    }

    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId, doctor: { doctor_id: doctorId } },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Check if slot has appointments
    // ✅ Check for any bookings in the same session (date + session)
    const sessionSlots = await this.availabilityRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        date: slot.date,
        session: slot.session,
      },
    });

    const hasAnyAppointments = sessionSlots.some(s => s.current_bookings > 0);

    if (hasAnyAppointments) {
      throw new ConflictException('Cannot update slot — appointments exist in the session');
    }

    // Update fields if provided
    if (dto.consulting_start_time) slot.consulting_start_time = dto.consulting_start_time;
    if (dto.consulting_end_time) slot.consulting_end_time = dto.consulting_end_time;
    if (dto.patients_per_slot) slot.patients_per_slot = dto.patients_per_slot;
    if (dto.booking_start_time) slot.booking_start_time = dto.booking_start_time;
    if (dto.booking_end_time) slot.booking_end_time = dto.booking_end_time;

    // Recalculate duration and interval if times changed
    const patientsPerSlot = slot.patients_per_slot ?? 1;
    if (dto.consulting_start_time || dto.consulting_end_time) {
      const slotDuration = this.calculateSlotDuration(
        slot.consulting_start_time,
        slot.consulting_end_time,
      );

      slot.slot_duration_minutes = slotDuration;
      slot.reporting_interval_minutes = Math.floor(slotDuration / patientsPerSlot);
    }

    // Validate configuration
    this.validatePatientsPerSlot(doctor.schedule_type, patientsPerSlot);

    // Check for overlaps
    await this.checkForOverlappingSlots(
      doctorId,
      slot.date,
      slot.consulting_start_time,
      slot.consulting_end_time,
      slotId,
    );

    const updatedSlot = await this.availabilityRepo.save(slot);

    return {
      message: 'Slot updated successfully',
      slot: {
        id: updatedSlot.id,
        date: updatedSlot.date,
        consulting_start_time: updatedSlot.consulting_start_time,
        consulting_end_time: updatedSlot.consulting_end_time,
        patients_per_slot: updatedSlot.patients_per_slot,
        slot_duration_minutes: updatedSlot.slot_duration_minutes,
        reporting_interval_minutes: updatedSlot.reporting_interval_minutes,
      },
    };
  }

  // ✅ FIXED: Delete slot
  async deleteSlot(doctorId: number, slotId: number, requestingUserId: number) {
    const doctor = await this.findOne(doctorId);
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own slots');
    }

    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId, doctor: { doctor_id: doctorId } },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    // Check if slot has appointments
     const sessionSlots = await this.availabilityRepo.find({
  where: { doctor: { doctor_id: doctorId }, date: slot.date, session: slot.session },
  relations: ['doctor'],
});

const anyAppointments = sessionSlots.some(s => s.current_bookings > 0);
if (anyAppointments) {
  throw new ConflictException('Cannot delete slot — appointments exist in the session');
}

    await this.availabilityRepo.remove(slot);

    return {
      message: 'Slot deleted successfully',
      slot_id: slotId,
    };
  }

  async createSlot(
  doctorId: number,
  availabilityId: number,
  dto: CreateSlotDto,
  requestingUserId: number,
) {
  const doctor = await this.findOne(doctorId);
  if (doctor.user.id !== requestingUserId) {
    throw new ForbiddenException('You can only create slots for your own profile');
  }

  const availability = await this.availabilityRepo.findOne({
    where: { id: availabilityId },
    relations: ['doctor'],
  });

  if (!availability) {
    throw new NotFoundException('Doctor availability not found');
  }

  if (availability.doctor.doctor_id !== doctorId) {
    throw new ForbiddenException('This availability does not belong to you');
  }

  const today = new Date();
  const selectedDate = new Date(dto.date);
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  if (selectedDate < today) {
    throw new BadRequestException('Cannot create slot for a past date');
  }

  const slotDuration = this.calculateSlotDuration(dto.consulting_start_time, dto.consulting_end_time);

  if (slotDuration < 10) {
    throw new BadRequestException('Slot duration must be at least 10 minutes');
  }

  this.validatePatientsPerSlot(doctor.schedule_type, dto.patients_per_slot);
  this.validateReportingInterval(
    doctor.schedule_type,
    Math.floor(slotDuration / dto.patients_per_slot),
    doctor.default_consulting_time_per_patient,
  );

  this.validateBookingWindow(
  new Date(dto.booking_start_time),
  new Date(dto.booking_end_time),
);


  const newSlot = this.slotRepo.create({
    doctor,
    availability,
    date: dto.date,
    day_of_week: dto.weekday,
    start_time: dto.consulting_start_time,
    end_time: dto.consulting_end_time,
    patients_per_slot: dto.patients_per_slot,
    slot_duration_minutes: slotDuration,
    current_bookings: 0,
    is_fully_booked: false,
    slot_bookings: {},
    created_at: new Date(),
    updated_at: new Date(),
  });

  const savedSlot = await this.slotRepo.save(newSlot);

  return {
    message: 'Slot created successfully under availability',
    slot: {
      id: savedSlot.slot_id,
      start_time: savedSlot.start_time,
      end_time: savedSlot.end_time,
      slot_duration_minutes: savedSlot.slot_duration_minutes,
      patients_per_slot: savedSlot.patients_per_slot,
    },
  };
}


  async createAvailability(
  doctorId: number,
  dto: CreateAvailabilityDto,
  requestingUserId: number
) {
  const doctor = await this.findOne(doctorId);

  if (doctor.user.id !== requestingUserId) {
    throw new ForbiddenException('You can only create availability for your own profile');
  }

  const bookingStart = new Date(dto.booking_start_time);
  const bookingEnd = new Date(dto.booking_end_time);

  if (bookingStart >= bookingEnd) {
    throw new BadRequestException('Booking start time must be before end time');
  }

  const availability = this.availabilityRepo.create({
    ...dto,
    doctor,
    slot_status: 'active',
    current_bookings: 0,
    is_fully_booked: false,
    slot_bookings: {},
  });

  const saved = await this.availabilityRepo.save(availability);
  return {
    message: 'Availability created',
    availability_id: saved.id,
  };
}



  private calculateSlotDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('Consulting start time must be before end time');
    }

    return endMinutes - startMinutes;
  }

  private validatePatientsPerSlot(scheduleType: string, patientsPerSlot: number) {
    if (scheduleType === 'stream' && patientsPerSlot !== 1) {
      throw new BadRequestException('Stream scheduling must have exactly 1 patient per slot');
    }

    if (scheduleType === 'wave' && patientsPerSlot < 2) {
      throw new BadRequestException('Wave scheduling requires at least 2 patients per slot');
    }
  }

  private validateReportingInterval(scheduleType: string, reportingInterval: number, consultingTime: number) {
    if (reportingInterval < 5) {
      throw new BadRequestException('Reporting interval must be at least 5 minutes');
    }

    if (scheduleType === 'wave' && reportingInterval < consultingTime) {
      throw new BadRequestException(
        `Reporting interval (${reportingInterval} min) must be >= consulting time per patient (${consultingTime} min)`,
      );
    }
  }

  private validateBookingWindow(startTime: Date, endTime: Date) {
    if (startTime >= endTime) {
      throw new BadRequestException('Booking start time must be before end time');
    }

    const now = new Date();
    if (endTime <= now) {
      throw new BadRequestException('Booking end time must be in the future');
    }
  }

  private async checkForOverlappingSlots(
    doctorId: number,
    date: string,
    startTime: string,
    endTime: string,
    excludeSlotId?: number,
  ) {
    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
      date,
    };

    if (excludeSlotId) {
      whereConditions.id = Not(excludeSlotId);
    }

    const existingSlots = await this.availabilityRepo.find({
      where: whereConditions,
    });

    const [newStartH, newStartM] = startTime.split(':').map(Number);
    const [newEndH, newEndM] = endTime.split(':').map(Number);
    const newStartMinutes = newStartH * 60 + newStartM;
    const newEndMinutes = newEndH * 60 + newEndM;

    for (const slot of existingSlots) {
      const [existingStartH, existingStartM] = slot.consulting_start_time.split(':').map(Number);
      const [existingEndH, existingEndM] = slot.consulting_end_time.split(':').map(Number);
      const existingStartMinutes = existingStartH * 60 + existingStartM;
      const existingEndMinutes = existingEndH * 60 + existingEndM;

      if (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes) {
        throw new ConflictException(
          `Slot overlaps with existing slot from ${slot.consulting_start_time} to ${slot.consulting_end_time}`,
        );
      }
    }
  }
}