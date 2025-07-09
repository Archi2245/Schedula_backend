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

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,

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
    if (slot.current_bookings > 0) {
      throw new ConflictException('Cannot update slot with existing appointments');
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
    if (slot.current_bookings > 0) {
      throw new ConflictException('Cannot delete slot with existing appointments');
    }

    await this.availabilityRepo.remove(slot);

    return {
      message: 'Slot deleted successfully',
      slot_id: slotId,
    };
  }

  async createSlot(
    doctorId: number,
    dto: CreateSlotDto,
    requestingUserId: number,
  ) {
    const doctor = await this.findOne(doctorId);
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only create slots for your own profile');
    }

    const { canCreate, errors } = doctor.canCreateSlots();
    if (!canCreate) {
      throw new BadRequestException(errors.join(', '));
    }

    const today = new Date();
    const selectedDate = new Date(dto.date);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      throw new BadRequestException('Cannot create slot for past date');
    }

    const { consulting_start_time, consulting_end_time } = dto;
    const slotDuration = this.calculateSlotDuration(consulting_start_time, consulting_end_time);

    if (slotDuration < 10) {
      throw new BadRequestException('Slot duration must be at least 10 minutes');
    }

    this.validatePatientsPerSlot(doctor.schedule_type, dto.patients_per_slot);

    const reportingInterval = Math.floor(
      slotDuration / (dto.patients_per_slot || 1),
    );
    this.validateReportingInterval(
      doctor.schedule_type,
      reportingInterval,
      doctor.default_consulting_time_per_patient,
    );

    this.validateBookingWindow(dto.booking_start_time, dto.booking_end_time);

    await this.checkForOverlappingSlots(
      doctorId,
      dto.date,
      consulting_start_time,
      consulting_end_time,
    );

    const doctorEntity = await this.doctorRepository.findOneByOrFail({ doctor_id: doctorId });

    const slot = this.availabilityRepo.create({
      doctor: doctorEntity,
      date: dto.date,
      weekday: dto.weekday,
      session: dto.session,
      consulting_start_time,
      consulting_end_time,
      patients_per_slot: dto.patients_per_slot ?? 1,
      slot_duration_minutes: slotDuration,
      reporting_interval_minutes: reportingInterval,
      booking_start_time: dto.booking_start_time,
      booking_end_time: dto.booking_end_time,
      current_bookings: 0,
      is_fully_booked: false,
      slot_bookings: {},
      slot_status: 'active', // ✅ Set as active by default
    });

    const savedSlot = await this.availabilityRepo.save(slot);

    return {
      message: 'Slot created successfully',
      slot: {
        id: savedSlot.id,
        date: savedSlot.date,
        consulting_start_time: savedSlot.consulting_start_time,
        consulting_end_time: savedSlot.consulting_end_time,
        patients_per_slot: savedSlot.patients_per_slot,
        slot_duration_minutes: savedSlot.slot_duration_minutes,
        reporting_interval_minutes: savedSlot.reporting_interval_minutes,
        available_spots: savedSlot.getAvailableSpots(),
        reporting_times: savedSlot.getReportingTimes(),
      },
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