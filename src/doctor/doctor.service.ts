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
import { TimeSlot } from '../entities/time-slot.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { UpdateScheduleTypeDto } from './dto/update-schedule-type.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { AppointmentsService } from '../appointments/appointments.service';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,

    @InjectRepository(TimeSlot)
    private slotRepo: Repository<TimeSlot>,

    private appointmentsService: AppointmentsService,
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

  async getDoctorSlots(doctorId: number, query: SlotQueryDto) {
    const { page = 1, limit = 10, date, status } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
    };

    if (date) whereConditions.date = date;
    if (status) whereConditions.slot_status = status;

    const [slots, total] = await this.slotRepo.findAndCount({
      where: whereConditions,
      relations: ['doctor', 'availability'],
      order: { date: 'ASC', start_time: 'ASC' },
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

  async getAvailableSlotsForPatients(doctorId: number, query: SlotQueryDto) {
    const { date } = query;
    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
      slot_status: 'active',
      is_fully_booked: false,
    };

    if (date) whereConditions.date = date;

    const slots = await this.slotRepo.find({
      where: whereConditions,
      relations: ['doctor', 'availability'],
      order: { date: 'ASC', start_time: 'ASC' },
    });

    const availableSlots = slots.filter(slot => slot.isBookingWindowOpen());

    return {
      doctor_id: doctorId,
      available_slots: availableSlots.map(slot => ({
        slot_id: slot.slot_id,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        available_spots: slot.patients_per_slot - slot.current_bookings,
        total_spots: slot.patients_per_slot,
        is_fully_booked: slot.is_fully_booked,
        reporting_times: slot.getReportingTimes(),
        booking_closes_at: slot.booking_end_time,
      })),
    };
  }

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

    const slot = await this.slotRepo.findOne({
      where: { slot_id: slotId, doctor: { doctor_id: doctorId } },
    });

    if (!slot) throw new NotFoundException('Slot not found');

    const hasAppointments = slot.current_bookings > 0;
    if (hasAppointments) {
      throw new ConflictException('Cannot update slot — appointments exist');
    }

    if (dto.start_time) slot.start_time = dto.start_time;
    if (dto.end_time) slot.end_time = dto.end_time;
    if (dto.patients_per_slot) slot.patients_per_slot = dto.patients_per_slot;
    if (dto.booking_start_time) {
  slot.booking_start_time = new Date(dto.booking_start_time);
}

if (dto.booking_end_time) {
  slot.booking_end_time = new Date(dto.booking_end_time);
}


    const slotDuration = this.calculateSlotDuration(slot.start_time, slot.end_time);
    slot.slot_duration_minutes = slotDuration;

    this.validatePatientsPerSlot(doctor.schedule_type, slot.patients_per_slot);
    this.validateBookingWindow(slot.booking_start_time, slot.booking_end_time);

    await this.checkForOverlappingSlots(doctorId, slot.date, slot.start_time, slot.end_time, slot.slot_id);

    const updated = await this.slotRepo.save(slot);

    return {
      message: 'Slot updated successfully',
      slot: updated,
    };
  }

  async deleteSlot(doctorId: number, slotId: number, requestingUserId: number) {
    const doctor = await this.findOne(doctorId);
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own slots');
    }

    const slot = await this.slotRepo.findOne({
      where: { slot_id: slotId, doctor: { doctor_id: doctorId } },
    });

    if (!slot) throw new NotFoundException('Slot not found');

    if (slot.current_bookings > 0) {
      throw new ConflictException('Cannot delete slot — appointments exist');
    }

    await this.slotRepo.remove(slot);

    return {
      message: 'Slot deleted successfully',
      slot_id: slotId,
    };
  }

  async createAvailability(
    doctorId: number,
    dto: CreateAvailabilityDto,
    requestingUserId: number,
  ) {
    const doctor = await this.findOne(doctorId);

    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only create availability for your own profile');
    }

    this.validateBookingWindow(new Date(dto.booking_start_time), new Date(dto.booking_end_time));

    const availability = this.availabilityRepo.create({
  date: dto.date,
  weekday: dto.weekday,
  session: dto.session,
  consulting_start_time: dto.consulting_start_time,
  consulting_end_time: dto.consulting_end_time,
  doctor: doctor,
  slot_status: 'active',
});


    const saved = await this.availabilityRepo.save(availability);

    return {
      message: 'Availability created',
      availability_id: saved.id,
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

    if (!availability) throw new NotFoundException('Doctor availability not found');
    if (availability.doctor.doctor_id !== doctorId) {
      throw new ForbiddenException('This availability does not belong to you');
    }

    const slotDuration = this.calculateSlotDuration(dto.start_time, dto.end_time);

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


    const slot = this.slotRepo.create({
      doctor,
      availability,
      date: dto.date,
      day_of_week: dto.weekday,
      start_time: dto.start_time,
      end_time: dto.end_time,
      slot_duration_minutes: slotDuration,
      patients_per_slot: dto.patients_per_slot,
      booking_start_time: dto.booking_start_time,
      booking_end_time: dto.booking_end_time,
      slot_status: 'active',
      is_fully_booked: false,
      current_bookings: 0,
      slot_bookings: {},
    });

    const saved = await this.slotRepo.save(slot);

    return {
      message: 'Slot created successfully',
      slot: saved,
    };
  }

  private calculateSlotDuration(startTime: string, endTime: string): number {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const start = startH * 60 + startM;
    const end = endH * 60 + endM;

    if (start >= end) {
      throw new BadRequestException('Start time must be before end time');
    }

    return end - start;
  }

  private validatePatientsPerSlot(scheduleType: string, patientsPerSlot: number) {
    if (scheduleType === 'stream' && patientsPerSlot !== 1) {
      throw new BadRequestException('Stream scheduling must have exactly 1 patient per slot');
    }

    if (scheduleType === 'wave' && patientsPerSlot < 2) {
      throw new BadRequestException('Wave scheduling requires at least 2 patients per slot');
    }
  }

  private validateReportingInterval(
    scheduleType: string,
    reportingInterval: number,
    consultingTime: number,
  ) {
    if (reportingInterval < 5) {
      throw new BadRequestException('Reporting interval must be at least 5 minutes');
    }

    if (scheduleType === 'wave' && reportingInterval < consultingTime) {
      throw new BadRequestException(
        `Reporting interval (${reportingInterval}) must be >= consulting time per patient (${consultingTime})`,
      );
    }
  }

  private validateBookingWindow(start: Date, end: Date) {
    const now = new Date();
    if (start >= end) {
      throw new BadRequestException('Booking start time must be before end time');
    }
    if (end <= now) {
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
    const existingSlots = await this.slotRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        date,
        ...(excludeSlotId ? { slot_id: Not(excludeSlotId) } : {}),
      },
    });

    const [newStartH, newStartM] = startTime.split(':').map(Number);
    const [newEndH, newEndM] = endTime.split(':').map(Number);
    const newStartMin = newStartH * 60 + newStartM;
    const newEndMin = newEndH * 60 + newEndM;

    for (const slot of existingSlots) {
      const [existStartH, existStartM] = slot.start_time.split(':').map(Number);
      const [existEndH, existEndM] = slot.end_time.split(':').map(Number);
      const existStartMin = existStartH * 60 + existStartM;
      const existEndMin = existEndH * 60 + existEndM;

      if (newStartMin < existEndMin && newEndMin > existStartMin) {
        throw new ConflictException(
          `Overlaps with existing slot ${slot.start_time} to ${slot.end_time}`,
        );
      }
    }
  }
}
