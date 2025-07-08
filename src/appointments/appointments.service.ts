// ✅ FINAL Appointment Service
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { Patient } from '../entities/patient.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  markAsCompleted(appointmentId: number, sub: any) {
    throw new Error('Method not implemented.');
  }
  getDoctorAppointments(doctorId: number) {
    throw new Error('Method not implemented.');
  }
  getPatientAppointments(sub: any) {
    throw new Error('Method not implemented.');
  }
  create(dto: CreateAppointmentDto, sub: any) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(DoctorAvailability)
    private readonly slotRepo: Repository<DoctorAvailability>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  // ✅ Book appointment
  async createAppointment(dto: CreateAppointmentDto, patientId: number) {
  const slot = await this.slotRepo.findOne({
    where: { id: dto.slot_id },
    relations: ['doctor'],
  });
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

  const patient = await this.patientRepo.findOne({ where: { id: patientId } });
  if (!patient) throw new NotFoundException('Patient not found');

  const existing = await this.appointmentRepo.findOne({
  where: {
    patient: { id: patientId },
    timeSlot: { id: slot.id },
    appointment_status: 'confirmed',
  } as any,
});
  if (existing) throw new ConflictException('You already booked this slot');

  const position = slot.current_bookings + 1;
  const reportingTimes = slot.getReportingTimes();
  const reportingTimeStr = reportingTimes[position - 1];
  const reportingTime = new Date(`${slot.date}T${reportingTimeStr}`);
  const scheduledOn = new Date(`${slot.date}T${slot.consulting_start_time}`);

  const appointment = this.appointmentRepo.create({
    doctor: slot.doctor,
    patient,
    timeSlot: slot, // ✅ Correct relation name
    scheduled_on: scheduledOn,
    duration_minutes: slot.slot_duration_minutes ?? 15,
    appointment_status: 'confirmed',
    reporting_time: reportingTime,
    slot_position: position,
  });

  const saved = await this.appointmentRepo.save(appointment);

  // ✅ Update DoctorAvailability Slot
  slot.current_bookings = (slot.current_bookings ?? 0) + 1;
  slot.is_fully_booked = slot.current_bookings >= (slot.patients_per_slot ?? 1);

  const slotBookings = slot.slot_bookings || {};
  slotBookings[position] = {
    patient_id: patient.id,
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

  // ✅ Cancel appointment
  async cancelAppointment(appointmentId: number, patientId: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: appointmentId },
      relations: ['slot', 'patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.patient.id !== patientId) throw new ForbiddenException('Unauthorized');

    const slot = appointment.slot;
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

  // ✅ Get my appointments
  async getMyAppointments(patientId: number) {
    return this.appointmentRepo.find({
      where: { patient: { id: patientId } },
      relations: ['doctor', 'slot'],
      order: { scheduled_on: 'ASC' },
    });
  }

  // ✅ Get appointments by slot ID (for doctor dashboard)
  async getAppointmentsBySlot(slotId: number) {
    return this.appointmentRepo.find({
      where: { slot: { id: slotId } },
      relations: ['patient'],
      order: { slot_position: 'ASC' },
    });
  }

  // ✅ Get single appointment details
  async getAppointmentById(id: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id: id },
      relations: ['slot', 'doctor', 'patient'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    return appointment;
  }
}
