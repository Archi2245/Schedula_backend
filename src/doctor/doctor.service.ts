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
import { generateAvailableSlots } from './utils/slot-generator';

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
  async createAvailability(doctorId: number, dto: CreateAvailabilityDto, requestingUserId?: number) {
  const { date, weekday, session, start_time, end_time } = dto;

  // ✅ 1. Validate date is not in the past
  const today = new Date();
  const selectedDate = new Date(date);
  today.setHours(0, 0, 0, 0); // Reset time for accurate comparison
  selectedDate.setHours(0, 0, 0, 0);
  
  if (selectedDate < today) {
    throw new BadRequestException('Cannot select a past date');
  }

  // ✅ 2. Validate time range
  const [startH, startM] = start_time.split(':').map(Number);
  const [endH, endM] = end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes >= endMinutes) {
    throw new BadRequestException('Start time must be before end time');
  }

  if (endMinutes - startMinutes < 30) {
    throw new BadRequestException('Session must be at least 30 minutes long');
  }

  // ✅ 3. Find doctor and validate ownership (if userId provided)
  const doctor = await this.doctorRepository.findOne({
    where: { doctor_id: doctorId },
    relations: ['user'],
  });

  if (!doctor) {
    throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
  }

  // ✅ 4. Check if doctor is setting their own availability
  if (requestingUserId && doctor.user.id !== requestingUserId) {
    throw new ForbiddenException('You can only set availability for your own profile');
  }

  // ✅ 5. Check for existing availability
  const exists = await this.availabilityRepo.findOne({
    where: {
      doctor: { doctor_id: doctorId },
      date,
      session,
    },
  });

  if (exists) {
    throw new BadRequestException(
      `Availability already exists for ${session} session on ${date}`
    );
  }

  // ✅ 6. Validate doctor's schedule configuration
  this.validateDoctorScheduleConfig(doctor);

  // ✅ 7. Generate time slots using doctor's configuration
  const slots = generateAvailableSlots(
    start_time,
    end_time,
    doctor.schedule_type,
    doctor.slot_duration,
    doctor.patients_per_slot,
    doctor.consulting_time_per_patient
  );

  const timeSlots = slots.map(slot => slot.time);

  // ✅ 8. Create availability record
  const record = this.availabilityRepo.create({
    doctor: { doctor_id: doctorId } as any,
    date,
    weekday,
    session,
    start_time,
    end_time,
    time_slots: timeSlots,
    booked_slots: [],
    slot_bookings: {}, // Initialize empty bookings object
  });

  const savedRecord = await this.availabilityRepo.save(record);

  return {
    message: 'Availability created successfully',
    availability: savedRecord,
    generated_slots: slots.length,
    schedule_type: doctor.schedule_type,
    slot_duration: doctor.slot_duration,
    patients_per_slot: doctor.patients_per_slot,
  };
}
  private validateDoctorScheduleConfig(doctor: Doctor): void {
  if (!doctor.schedule_type) {
    throw new BadRequestException('Doctor must have a schedule_type set (stream or wave)');
  }

  if (!doctor.slot_duration || doctor.slot_duration < 5) {
    throw new BadRequestException('Doctor must have a valid slot_duration (minimum 5 minutes)');
  }

  if (!doctor.patients_per_slot || doctor.patients_per_slot < 1) {
    throw new BadRequestException('Doctor must have a valid patients_per_slot (minimum 1)');
  }

  if (!doctor.consulting_time_per_patient || doctor.consulting_time_per_patient < 5) {
    throw new BadRequestException('Doctor must have a valid consulting_time_per_patient (minimum 5 minutes)');
  }

  // Wave scheduling validations
  if (doctor.schedule_type === 'wave') {
    const reportingInterval = Math.floor(doctor.slot_duration / doctor.patients_per_slot);
    
    if (reportingInterval < doctor.consulting_time_per_patient) {
      throw new BadRequestException(
        `Invalid wave configuration: Reporting interval (${reportingInterval} min) is less than consulting time (${doctor.consulting_time_per_patient} min). ` +
        `Either increase slot_duration or reduce patients_per_slot.`
      );
    }
    
    if (doctor.patients_per_slot < 2) {
      throw new BadRequestException('Wave scheduling requires at least 2 patients per slot');
    }
  }

  // Stream scheduling validations
  if (doctor.schedule_type === 'stream') {
    if (doctor.patients_per_slot !== 1) {
      throw new BadRequestException('Stream scheduling must have exactly 1 patient per slot');
    }
    
    if (doctor.slot_duration < doctor.consulting_time_per_patient) {
      throw new BadRequestException(
        `Stream scheduling: slot_duration (${doctor.slot_duration} min) must be >= consulting_time_per_patient (${doctor.consulting_time_per_patient} min)`
      );
    }
  }
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