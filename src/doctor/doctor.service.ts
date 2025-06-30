import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { UpdateScheduleTypeDto } from './dto/update-schedule-type.dto';
import { generateTimeSlots } from './utils/slot-generator';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,
  ) {}

  // 🔍 Step 1: Get all doctors (with optional search)
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

  // 🔍 Step 2: Get a doctor by ID
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

  // 🆕 NEW: Update doctor's schedule type
  async updateScheduleType(
    doctorId: number,
    dto: UpdateScheduleTypeDto,
    requestingUserId: number,
  ) {
    // Find the doctor
    const doctor = await this.doctorRepository.findOne({
      where: { doctor_id: doctorId },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    // Ensure only the doctor themselves can update their schedule type
    if (doctor.user.id !== requestingUserId) {
      throw new ForbiddenException(
        'You can only update your own schedule type'
      );
    }

    // Update schedule type
    doctor.schedule_type = dto.schedule_type;
    await this.doctorRepository.save(doctor);

    return {
      message: 'Schedule type updated successfully',
      doctor_id: doctor.doctor_id,
      schedule_type: doctor.schedule_type,
    };
  }

  // ✅ Step 3: Doctor sets availability
  async createAvailability(doctorId: number, dto: CreateAvailabilityDto) {
  const { date, weekday, session, start_time, end_time } = dto;

  const today = new Date().toISOString().split('T')[0];
  if (date < today) {
    throw new BadRequestException('Cannot select a past date');
  }

  const exists = await this.availabilityRepo.findOne({
    where: {
      doctor: { doctor_id: doctorId },
      date,
      session,
    },
    relations: ['doctor'],
  });

  if (exists) {
    throw new BadRequestException(
      'Availability already exists for this date and session'
    );
  }

  const slots = generateTimeSlots(start_time, end_time);

  const record = this.availabilityRepo.create({
    doctor: { doctor_id: doctorId },
    date,
    weekday,
    session,
    start_time,
    end_time,
    time_slots: slots,
    booked_slots: [], // ✅ FIX: Explicitly set empty array
  });

  return await this.availabilityRepo.save(record);
}

  async getAvailableSlots(doctorId: number, page = 1, limit = 5) {
    // Get doctor info to include schedule_type
    const doctor = await this.findOne(doctorId);

    const [records, total] = await this.availabilityRepo.findAndCount({
      where: { doctor: { doctor_id: doctorId } },
      order: { date: 'ASC' },
      relations: ['doctor'],
      skip: (page - 1) * limit,
      take: limit,
    });

    const data = records.map((entry) => {
      const availableSlots = entry.time_slots.filter(
        (slot) => !entry.booked_slots.includes(slot)
      );

      return {
        date: entry.date,
        weekday: entry.weekday,
        session: entry.session,
        available_slots: availableSlots,
        schedule_type: doctor.schedule_type, // Include schedule type info
      };
    });

    return {
      current_page: page,
      total_entries: total,
      entries_returned: data.length,
      doctor_schedule_type: doctor.schedule_type,
      data,
    };
  }
}