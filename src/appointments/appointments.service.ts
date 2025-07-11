// ✅ COMPLETE Appointment Service Implementation
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Role } from 'src/types/roles.enum';
import { TimeSlot } from 'src/entities/time-slot.entity';
import { In } from 'typeorm';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(TimeSlot)
    private readonly slotRepo: Repository<TimeSlot>,


    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  // ✅ FIXED: Create appointment (called from controller)
  async create(dto: CreateAppointmentDto, patientId: number, slotId: number ) {
    return this.createAppointment(dto, patientId, slotId);
  }

  // ✅ FIXED: Get patient appointments
  async getPatientAppointments(patientId: number) {
    return this.appointmentRepo.find({
      where: { patient: { patient_id: patientId } },
      relations: ['doctor', 'timeSlot'],
      order: { scheduled_on: 'ASC' },
    });
  }

  // ✅ FIXED: Get doctor appointments
  async getDoctorAppointments(doctorId: number) {
    return this.appointmentRepo.find({
      where: { doctor: { doctor_id: doctorId } },
      relations: ['patient', 'timeSlot'],
      order: { scheduled_on: 'ASC' },
    });
  }

  // ✅ FIXED: Mark appointment as completed
  async markAsCompleted(appointmentId: number, doctorId: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['doctor', 'patient'],
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.doctor.doctor_id !== doctorId) {
      throw new ForbiddenException('You can only complete your own appointments');
    }

    if (appointment.appointment_status !== 'confirmed') {
      throw new BadRequestException('Only confirmed appointments can be marked as completed');
    }

    appointment.appointment_status = 'completed';
    await this.appointmentRepo.save(appointment);

    return {
      message: 'Appointment marked as completed',
      appointment_id: appointment.appointment_id,
      status: 'completed',
    };
  }

  // ✅ Book appointment (main logic)
  async createAppointment(dto: CreateAppointmentDto, userId: number, slotId: number) {
  const slot = await this.slotRepo.findOne({
    where: { slot_id: slotId },
    relations: ['doctor'],
  })as TimeSlot;

  if (!slot) throw new NotFoundException('Slot not found');

  if (slot.slot_status !== 'active') {
    throw new ConflictException('Slot is not active');
  }

  if (!slot.isBookingWindowOpen()) {
    throw new ConflictException('Booking window is closed');
  }

  if (slot.current_bookings >= (slot.patients_per_slot ?? 1)) {
    throw new ConflictException('Slot is fully booked');
  }

  // ✅ FIX: Patient lookup via User ID
  const patient = await this.patientRepo.findOne({
    where: { user: { id: userId } },
    relations: ['user'],
  });
  if (!patient) throw new NotFoundException('Patient not found');

  // ✅ Prevent double booking
  const existing = await this.appointmentRepo.findOne({
    where: {
      patient: { patient_id: patient.patient_id },
      timeSlot: { slot_id: slot.slot_id },
      appointment_status: 'confirmed',
    },
  });
  if (existing) throw new ConflictException('You already booked this slot');

  const position = slot.current_bookings + 1;
  const reportingTimes = slot.getReportingTimes();
  const reportingTimeStr = reportingTimes[position - 1];
  const reportingTime = new Date(`${slot.date}T${reportingTimeStr}`);
  const scheduledOn = new Date(`${slot.date}T${slot.start_time}`);

  const appointment = this.appointmentRepo.create({
    doctor: slot.doctor,
    patient,
    timeSlot: slot,
    scheduled_on: scheduledOn,
    duration_minutes: slot.slot_duration_minutes ?? 15,
    appointment_status: 'confirmed',
    reporting_time: reportingTime,
    slot_position: position,
  });

  const saved = await this.appointmentRepo.save(appointment);

  // 🔁 Update Slot
  slot.current_bookings++;
  slot.is_fully_booked = slot.current_bookings >= (slot.patients_per_slot ?? 1);

  const slotBookings = slot.slot_bookings || {};
  slotBookings[position] = {
    patient_id: patient.patient_id,
    appointment_id: saved.appointment_id,
    position,
    reporting_time: reportingTimeStr,
  };
  slot.slot_bookings = slotBookings;

  await this.slotRepo.save(slot);

  return {
    message: 'Appointment booked successfully',
    appointment_id: saved.appointment_id,
    reporting_time: reportingTime,
  };
}


  // ✅ Cancel appointment by patient
  async cancelAppointment(appointmentId: number, patientId: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['timeSlot', 'patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patient.user.id !== patientId) throw new ForbiddenException('Unauthorized');

    const slot = appointment.timeSlot;
    if (!slot) throw new NotFoundException('Slot not found');

    // Remove from slot
    if (slot.slot_bookings) {
      for (const key in slot.slot_bookings) {
        if (slot.slot_bookings[key].appointment_id === appointment.appointment_id) {
          delete slot.slot_bookings[key];
        }
      }
    }
    slot.current_bookings = Math.max((slot.current_bookings ?? 1) - 1, 0);
    slot.is_fully_booked = false;

    appointment.appointment_status = 'cancelled';
    await this.slotRepo.save(slot);
    await this.appointmentRepo.save(appointment);
    return { message: 'Appointment cancelled successfully' };
  }

  // ✅ Check if appointments exist in session
  async hasAppointmentsInSession(doctorId: number, date: string, start: string, end: string) {
    const startDateTime = new Date(`${date}T${start}`);
    const endDateTime = new Date(`${date}T${end}`);

    const count = await this.appointmentRepo.count({
      where: {
        doctor: { doctor_id: doctorId },
        scheduled_on: Between(startDateTime, endDateTime),
        appointment_status: 'confirmed',
      },
    });
    return count > 0;
  }

  // ✅ Get my appointments (alternative method name)
  async getMyAppointments(patientId: number) {
    return this.appointmentRepo.find({
      where: { patient: { patient_id: patientId } },
      relations: ['doctor', 'timeSlot'],
      order: { scheduled_on: 'ASC' },
    });
  }

  // ✅ Get appointments by slot ID (for doctor dashboard)
  async getAppointmentsBySlot(slotId: number) {
    return this.appointmentRepo.find({
      where: { timeSlot: { slot_id: slotId } },
      relations: ['patient'],
      order: { slot_position: 'ASC' },
    });
  }

  // ✅ Get single appointment details
  async getAppointmentById(id: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: id },
      relations: ['timeSlot', 'doctor', 'patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  } 
  async getAppointmentsByStatus(userId: number, role: Role, status: string) {
  const now = new Date();

  const qb = this.appointmentRepo
    .createQueryBuilder('appointment')
    .leftJoinAndSelect('appointment.doctor', 'doctor')
    .leftJoinAndSelect('doctor.user', 'doctorUser')
    .leftJoinAndSelect('appointment.patient', 'patient')
    .leftJoinAndSelect('patient.user', 'patientUser')
    .leftJoinAndSelect('appointment.timeSlot', 'timeSlot');

  if (role === Role.DOCTOR) {
  qb.andWhere('doctor.doctor_id = :doctorId', { doctorId: userId });
  } else if (role === Role.PATIENT) {
    qb.andWhere('patientUser.id = :userId', { userId });
  }

  if (status === 'upcoming') {
    qb.andWhere('appointment.scheduled_on >= :now', { now });
    qb.andWhere('appointment.appointment_status = :status', { status: 'confirmed' });
  } else if (status === 'past') {
    qb.andWhere('appointment.scheduled_on < :now', { now });
    qb.andWhere('appointment.appointment_status = :status', { status: 'confirmed' });
  } else if (status === 'cancelled') {
    qb.andWhere('appointment.appointment_status = :status', { status: 'cancelled' });
  }

  return qb.getMany();
}


async cancelAppointmentByDoctor(appointmentId: number, doctorId: number) {
  const appointment = await this.appointmentRepo.findOne({
    where: { appointment_id: appointmentId },
    relations: ['timeSlot', 'doctor'],
  });

  if (!appointment) throw new NotFoundException('Appointment not found');
  if (appointment.doctor.user.id !== doctorId) {
    throw new ForbiddenException('Unauthorized');
  }

  const slot = appointment.timeSlot;
  if (!slot) throw new NotFoundException('Slot not found');

  // Remove from slot bookings
  if (slot.slot_bookings) {
    for (const key in slot.slot_bookings) {
      if (slot.slot_bookings[key].appointment_id === appointment.appointment_id) {
        delete slot.slot_bookings[key];
      }
    }
  }

  slot.current_bookings = Math.max((slot.current_bookings ?? 1) - 1, 0);
  slot.is_fully_booked = false;

  appointment.appointment_status = 'cancelled';
  await this.slotRepo.save(slot);
  await this.appointmentRepo.save(appointment);

  return { message: 'Appointment cancelled by doctor successfully' };
}

async rescheduleAllAppointments(doctorId: number, shift_minutes: number) {
  if (shift_minutes < 10 || shift_minutes > 180) {
    throw new BadRequestException('Shift must be between 10 and 180 minutes');
  }

  const now = new Date();

  const appointments = await this.appointmentRepo.find({
    where: {
      doctor: { doctor_id: doctorId },
      appointment_status: 'confirmed',
      scheduled_on: MoreThanOrEqual(now),
    },
    relations: ['timeSlot'],
  });

  for (const appointment of appointments) {
    const newScheduled = new Date(appointment.scheduled_on);
    newScheduled.setMinutes(newScheduled.getMinutes() + shift_minutes);

    const newReporting = appointment.reporting_time
      ? new Date(appointment.reporting_time)
      : null;

    if (newReporting) {
      newReporting.setMinutes(newReporting.getMinutes() + shift_minutes);
    }

    appointment.scheduled_on = newScheduled;
    appointment.reporting_time = newReporting;
  }

  await this.appointmentRepo.save(appointments);

  return {
    message: `${appointments.length} appointments rescheduled successfully.`,
  };
}

async rescheduleSelectedAppointments(
  doctorId: number,
  appointment_ids: number[],
  shift_minutes: number,
) {
  if (shift_minutes < 10 || shift_minutes > 180) {
    throw new BadRequestException(
      'Shift must be between 10 and 180 minutes',
    );
  }

  if (!appointment_ids || appointment_ids.length === 0) {
    throw new BadRequestException('No appointment IDs provided');
  }

  const appointments = await this.appointmentRepo
    .createQueryBuilder('appointment')
    .leftJoinAndSelect('appointment.timeSlot', 'timeSlot')
    .leftJoin('appointment.doctor', 'doctor')
    .where('appointment.appointment_id IN (:...ids)', { ids: appointment_ids })
    .andWhere('doctor.doctor_id = :doctorId', { doctorId })
    .andWhere('appointment.appointment_status = :status', {
      status: 'confirmed',
    })
    .getMany();

  if (appointments.length === 0) {
    throw new NotFoundException('No matching appointments found to reschedule');
  }

  for (const appointment of appointments) {
    const newScheduled = new Date(appointment.scheduled_on);
    newScheduled.setMinutes(newScheduled.getMinutes() + shift_minutes);

    const newReporting = appointment.reporting_time
      ? new Date(appointment.reporting_time)
      : null;

    if (newReporting) {
      newReporting.setMinutes(newReporting.getMinutes() + shift_minutes);
    }

    appointment.scheduled_on = newScheduled;
    appointment.reporting_time = newReporting;
  }

  await this.appointmentRepo.save(appointments);

  return {
    message: `${appointments.length} selected appointments rescheduled successfully.`,
  };
}



}