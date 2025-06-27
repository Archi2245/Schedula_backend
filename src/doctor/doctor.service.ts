import {
<<<<<<< HEAD
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { Doctor } from 'src/entities/doctor.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import * as dayjs from 'dayjs';
import { Timeslot } from 'src/entities/timeslot.entity';
import { DoctorAvailability } from 'src/entities/doctor_availablity.entity';
=======
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorAvailability } from 'src/entities/doctor-availability.entity';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { generateTimeSlots } from './utils/slot-generator';
>>>>>>> main

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
<<<<<<< HEAD
    private doctorRepo: Repository<Doctor>,

    @InjectRepository(Timeslot)
    private slotRepo: Repository<Timeslot>,
=======
    private doctorRepository: Repository<Doctor>,
>>>>>>> main

    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,
  ) {}

<<<<<<< HEAD
  async getDoctors(name?: string, specialization?: string) {
    const queryBuilder = this.doctorRepo.createQueryBuilder('doctor');

    if (name) {
      queryBuilder.andWhere(
        `(LOWER(doctor.first_name) ILIKE :name OR LOWER(doctor.last_name) ILIKE :name)`,
        { name: `%${name.toLowerCase()}%` },
      );
    }

    if (specialization) {
      queryBuilder.andWhere(
        `LOWER(doctor.specialization) ILIKE :specialization`,
        { specialization: `%${specialization.toLowerCase()}%` },
      );
    }
    return queryBuilder.getMany();
  }

  async getDoctorByID(id: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: id },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found with this id!');
    }

    return doctor;
  }

  async createAvailability(doctorId: number, dto: CreateAvailabilityDto) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });

    if (!doctor) throw new NotFoundException('Doctor not found');

    // ✅ 1. Check if date is in the past
    const today = dayjs().startOf('day');
    const requestedDate = dayjs(dto.date);
    if (requestedDate.isBefore(today)) {
      throw new BadRequestException(
        'Cannot create availability for a past date',
      );
    }

    // ✅ 2. Save availability record
    const availability = this.availabilityRepo.create({
      doctor,
      date: dto.date,
      start_time: dto.start_time,
      end_time: dto.end_time,
      session: dto.session,
      weekday: dto.weekday,
    });

    const savedAvailability = await this.availabilityRepo.save(availability);

    // ✅ 3. Use dayjs to split time
    const start = dayjs(`${dto.date}T${dto.start_time}`);
    const end = dayjs(`${dto.date}T${dto.end_time}`);

    const slots: Timeslot[] = [];

    let current = start;

    while (current.isBefore(end)) {
      const slotTime = current.format('HH:mm');

      // ✅ 4. Prevent duplicate slot (same doctor + date + time)
      const existing = await this.slotRepo.findOne({
        where: {
          doctor: { doctor_id: doctorId },
          slot_date: new Date(dto.date),
          slot_time: slotTime,
        },
      });

      if (!existing) {
        const slot = this.slotRepo.create({
          doctor,
          availability: savedAvailability,
          slot_date: dto.date,
          slot_time: slotTime,
          is_available: true,
          session: dto.session,
        });

        slots.push(slot);
      }

      current = current.add(30, 'minute');
    }

    await this.slotRepo.save(slots);

    return {
      message: 'Availability and slots created',
      total_slots: slots.length,
    };
  }

  async getAvailableSlots(doctorId: number, page: number, limit: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const today = dayjs().startOf('day').toDate();

    const [slots, total] = await this.slotRepo.findAndCount({
      where: {
        doctor: { doctor_id: doctorId },
        is_available: true,
        slot_date: MoreThanOrEqual(today), // ✅ Only today or future
      },
      relations: ['availability'],
      order: {
        slot_date: 'ASC',
        slot_time: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const grouped = slots.reduce(
      (acc, slot) => {
        const date = new Date(slot.slot_date).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = [];
        acc[date].push(slot.slot_time);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    return {
      doctor_id: doctorId,
      total_slots: total,
      page,
      limit,
      data: grouped,
    };
  }
}
=======
  // 🔍 Step 1: Get all doctors (with optional search)
  async findAll(search?: string): Promise<Doctor[]> {
    if (search) {
      return this.doctorRepository.find({
        where: [
          { name: ILike(`%${search}%`) },
          { specialization: ILike(`%${search}%`) },
        ],
        relations: ['user'], // include user info if needed
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
      booked_slots: [],
    });

    return await this.availabilityRepo.save(record);
  }

  async getAvailableSlots(doctorId: number, page = 1, limit = 5) {
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
    };
  });

  return {
    current_page: page,
    total_entries: total,
    entries_returned: data.length,
    data,
  };
}

}


>>>>>>> main
