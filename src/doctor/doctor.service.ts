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

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,
  ) {}

  // 🔍 Get all doctors (with optional search)
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

  // 🔍 Get a doctor by ID
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

  // 🔄 Update doctor's schedule type
  async updateScheduleType(
    doctorId: number,
    dto: UpdateScheduleTypeDto,
    requestingUserId: number,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { doctor_id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

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

  // 🔥 NEW: Create individual slot
  async createSlot(
    doctorId: number,
    dto: CreateSlotDto,
    requestingUserId: number,
  ) {
    // 1. Validate doctor and ownership
    const doctor = await this.findOne(doctorId);
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only create slots for your own profile');
    }

    // 2. Validate doctor can create slots
    const { canCreate, errors } = doctor.canCreateSlots();
    if (!canCreate) {
      throw new BadRequestException(errors.join(', '));
    }

    // 3. Validate date is not in the past
    const today = new Date();
    const selectedDate = new Date(dto.date);
    today.setHours(0, 0, 0, 0);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      throw new BadRequestException('Cannot create slot for past date');
    }

    // 4. Validate time range
    const { consulting_start_time, consulting_end_time } = dto;
    const slotDuration = this.calculateSlotDuration(consulting_start_time, consulting_end_time);
    
    if (slotDuration < 10) {
      throw new BadRequestException('Slot duration must be at least 10 minutes');
    }

    // 5. Validate patients per slot based on schedule type
    this.validatePatientsPerSlot(doctor.schedule_type, dto.patients_per_slot);

    // 6. Calculate reporting interval and validate
    const reportingInterval = Math.floor(slotDuration / dto.patients_per_slot);
    this.validateReportingInterval(doctor.schedule_type, reportingInterval, doctor.default_consulting_time_per_patient);

    // 7. Validate booking window
    this.validateBookingWindow(dto.booking_start_time, dto.booking_end_time);

    // 8. Check for overlapping slots
    await this.checkForOverlappingSlots(doctorId, dto.date, consulting_start_time, consulting_end_time);

    // 9. Create slot
    const slot = this.availabilityRepo.create({
      doctor: { doctor_id: doctorId },
      date: dto.date,
      weekday: dto.weekday,
      session: dto.session,
      consulting_start_time,
      consulting_end_time,
      patients_per_slot: dto.patients_per_slot,
      slot_duration_minutes: slotDuration,
      reporting_interval_minutes: reportingInterval,
      booking_start_time: dto.booking_start_time,
      booking_end_time: dto.booking_end_time,
      current_bookings: 0,
      is_fully_booked: false,
      slot_bookings: {},
      slot_status: 'active',
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

  // 🔥 NEW: Update existing slot
  async updateSlot(
    doctorId: number,
    slotId: number,
    dto: UpdateSlotDto,
    requestingUserId: number,
  ) {
    // 1. Find slot and validate ownership
    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId, doctor: { doctor_id: doctorId } },
      relations: ['doctor', 'doctor.user'],
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    if (slot.doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only update your own slots');
    }

    // 2. Check if slot can be modified
    if (!slot.canBeModified()) {
      throw new ConflictException(
        'Cannot modify this slot because appointments are already booked'
      );
    }

    // 3. Validate updates
    const updatedStartTime = dto.consulting_start_time || slot.consulting_start_time;
    const updatedEndTime = dto.consulting_end_time || slot.consulting_end_time;
    const updatedPatientsPerSlot = dto.patients_per_slot || slot.patients_per_slot;

    // 4. Validate new time range if changed
    if (dto.consulting_start_time || dto.consulting_end_time) {
      const newSlotDuration = this.calculateSlotDuration(updatedStartTime, updatedEndTime);
      
      if (newSlotDuration < 10) {
        throw new BadRequestException('Slot duration must be at least 10 minutes');
      }

      // Check for overlaps with other slots (excluding current slot)
      await this.checkForOverlappingSlots(
        doctorId,
        slot.date,
        updatedStartTime,
        updatedEndTime,
        slotId
      );

      slot.consulting_start_time = updatedStartTime;
      slot.consulting_end_time = updatedEndTime;
      slot.slot_duration_minutes = newSlotDuration;
    }

    // 5. Validate patients per slot if changed
    if (dto.patients_per_slot) {
      this.validatePatientsPerSlot(slot.doctor.schedule_type, updatedPatientsPerSlot);
      slot.patients_per_slot = updatedPatientsPerSlot;
    }

    // 6. Recalculate reporting interval
    slot.reporting_interval_minutes = Math.floor(slot.slot_duration_minutes / slot.patients_per_slot);
    this.validateReportingInterval(
      slot.doctor.schedule_type,
      slot.reporting_interval_minutes,
      slot.doctor.default_consulting_time_per_patient
    );

    // 7. Update booking window if provided
    if (dto.booking_start_time || dto.booking_end_time) {
      const newBookingStart = dto.booking_start_time || slot.booking_start_time;
      const newBookingEnd = dto.booking_end_time || slot.booking_end_time;
      
      this.validateBookingWindow(newBookingStart, newBookingEnd);
      
      slot.booking_start_time = newBookingStart;
      slot.booking_end_time = newBookingEnd;
    }

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
        available_spots: updatedSlot.getAvailableSpots(),
        reporting_times: updatedSlot.getReportingTimes(),
      },
    };
  }

  // 🔥 NEW: Delete slot
  async deleteSlot(doctorId: number, slotId: number, requestingUserId: number) {
    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId, doctor: { doctor_id: doctorId } },
      relations: ['doctor', 'doctor.user'],
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    if (slot.doctor.user.id !== requestingUserId) {
      throw new ForbiddenException('You can only delete your own slots');
    }

    if (!slot.canBeModified()) {
      throw new ConflictException(
        'Cannot delete this slot because appointments are already booked'
      );
    }

    await this.availabilityRepo.remove(slot);

    return { message: 'Slot deleted successfully' };
  }

  // 🔥 NEW: Get doctor's slots
  async getDoctorSlots(doctorId: number, query: SlotQueryDto) {
    const doctor = await this.findOne(doctorId);
    
    const whereConditions: any = { doctor: { doctor_id: doctorId } };
    
    if (query.date) {
      whereConditions.date = query.date;
    }
    
    if (query.session) {
      whereConditions.session = query.session;
    }
    
    if (query.status) {
      whereConditions.slot_status = query.status;
    }

    const [slots, total] = await this.availabilityRepo.findAndCount({
      where: whereConditions,
      order: { date: 'ASC', consulting_start_time: 'ASC' },
      skip: (query.page! - 1) * query.limit!,
      take: query.limit,
    });

    const slotsWithDetails = slots.map(slot => ({
      id: slot.id,
      date: slot.date,
      weekday: slot.weekday,
      session: slot.session,
      consulting_start_time: slot.consulting_start_time,
      consulting_end_time: slot.consulting_end_time,
      patients_per_slot: slot.patients_per_slot,
      slot_duration_minutes: slot.slot_duration_minutes,
      reporting_interval_minutes: slot.reporting_interval_minutes,
      current_bookings: slot.current_bookings,
      available_spots: slot.getAvailableSpots(),
      is_fully_booked: slot.is_fully_booked,
      slot_status: slot.slot_status,
      booking_window: {
        start: slot.booking_start_time,
        end: slot.booking_end_time,
        is_open: slot.isBookingWindowOpen(),
      },
      reporting_times: slot.getReportingTimes(),
      can_be_modified: slot.canBeModified(),
    }));

    return {
      current_page: query.page,
      total_slots: total,
      slots_returned: slotsWithDetails.length,
      doctor_schedule_type: doctor.schedule_type,
      slots: slotsWithDetails,
    };
  }

  // 🔥 NEW: Get available slots for patients
  async getAvailableSlotsForPatients(doctorId: number, query: SlotQueryDto) {
    const doctor = await this.findOne(doctorId);
    
    const whereConditions: any = { 
      doctor: { doctor_id: doctorId },
      slot_status: 'active',
      is_fully_booked: false,
    };
    
    if (query.date) {
      whereConditions.date = query.date;
    }
    
    if (query.session) {
      whereConditions.session = query.session;
    }

    const [slots, total] = await this.availabilityRepo.findAndCount({
      where: whereConditions,
      order: { date: 'ASC', consulting_start_time: 'ASC' },
      skip: (query.page! - 1) * query.limit!,
      take: query.limit,
    });

    // Filter slots where booking window is open
    const bookableSlots = slots.filter(slot => slot.isBookingWindowOpen());

    const slotsData = bookableSlots.map(slot => ({
      id: slot.id,
      date: slot.date,
      weekday: slot.weekday,
      session: slot.session,
      consulting_start_time: slot.consulting_start_time,
      consulting_end_time: slot.consulting_end_time,
      available_spots: slot.getAvailableSpots(),
      reporting_times: slot.getReportingTimes(),
      schedule_type: doctor.schedule_type,
      booking_closes_at: slot.booking_end_time,
    }));

    return {
      current_page: query.page,
      total_available_slots: bookableSlots.length,
      slots_returned: slotsData.length,
      doctor_schedule_type: doctor.schedule_type,
      slots: slotsData,
    };
  }

  // 🔧 Helper methods
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
        `Reporting interval (${reportingInterval} min) must be >= consulting time per patient (${consultingTime} min)`
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
    excludeSlotId?: number
  ) {
    const whereConditions: any = {
      doctor: { doctor_id: doctorId },
      date,
      slot_status: 'active',
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

      // Check for overlap
      if (
        (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes)
      ) {
        throw new ConflictException(
          `Slot overlaps with existing slot from ${slot.consulting_start_time} to ${slot.consulting_end_time}`
        );
      }
    }
  }
}