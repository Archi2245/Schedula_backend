import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private appointmentRepo: Repository<Appointment>,
    
    @InjectRepository(Doctor)
    private doctorRepo: Repository<Doctor>,
    
    @InjectRepository(Patient)
    private patientRepo: Repository<Patient>,
    
    @InjectRepository(DoctorAvailability)
    private availabilityRepo: Repository<DoctorAvailability>,
  ) {}

  async createAppointment(patientUserId: number, dto: CreateAppointmentDto) {
    // 1. Find patient by user ID
    const patient = await this.patientRepo.findOne({
      where: { user: { id: patientUserId } },
      relations: ['user'],
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    // 2. Find doctor and check if they exist
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: dto.doctor_id },
      relations: ['user'],
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${dto.doctor_id} not found`);
    }

    // 3. Check if doctor has availability for the requested date/session
    const availability = await this.availabilityRepo.findOne({
      where: {
        doctor: { doctor_id: dto.doctor_id },
        date: dto.date,
        session: dto.session,
      },
      relations: ['doctor'],
    });

    if (!availability) {
      throw new BadRequestException(
        'Doctor is not available for the selected date and session'
      );
    }

    // 4. Validate that the requested time slot exists in doctor's availability
    const requestedSlot = dto.start_time;
    if (!availability.time_slots.includes(requestedSlot)) {
      throw new BadRequestException(
        'Requested time slot is not available in doctor\'s schedule'
      );
    }

    // 5. Apply scheduling logic based on doctor's schedule_type
    if (doctor.schedule_type === 'stream') {
      // STREAM: Only one appointment per slot
      await this.handleStreamScheduling(availability, requestedSlot);
    } else if (doctor.schedule_type === 'wave') {
      // WAVE: Multiple appointments per slot (max 3)
      await this.handleWaveScheduling(availability, requestedSlot);
    }

    // 6. Create the appointment
    const appointment = this.appointmentRepo.create({
      appointment_date: dto.date,
      weekday: dto.weekday,
      session: dto.session,
      start_time: dto.start_time,
      end_time: dto.end_time,
      reason: dto.reason,
      notes: dto.notes,
      doctor: doctor,
      patient: patient,
      appointment_status: 'confirmed',
    });

    const savedAppointment = await this.appointmentRepo.save(appointment);

    // 7. Update availability booked_slots
    if (!Array.isArray(availability.booked_slots)) {
  availability.booked_slots = []; // Initialize as empty array if null/undefined
}

if (!availability.booked_slots.includes(requestedSlot)) {
  availability.booked_slots.push(requestedSlot);
  await this.availabilityRepo.save(availability);
}

    return {
      message: 'Appointment booked successfully',
      appointment: {
        appointment_id: savedAppointment.appointment_id,
        date: savedAppointment.appointment_date,
        time: savedAppointment.start_time,
        doctor_name: doctor.name,
        specialization: doctor.specialization,
        status: savedAppointment.appointment_status,
      },
    };
  }

  // Handle Stream Scheduling (1 patient per slot)
  private async handleStreamScheduling(
  availability: DoctorAvailability,
  requestedSlot: string,
) {
  // ✅ FIX: Safe check for booked_slots
  const bookedSlots = Array.isArray(availability.booked_slots) 
    ? availability.booked_slots 
    : [];
    
  if (bookedSlots.includes(requestedSlot)) {
    throw new ConflictException(
      'Time slot is already booked (Stream scheduling allows only 1 patient per slot)'
    );
  }
}

  // Handle Wave Scheduling (multiple patients per slot, max 3)
  private async handleWaveScheduling(
    availability: DoctorAvailability,
    requestedSlot: string,
  ) {
    // Count how many appointments are already booked for this slot
    const bookedCount = await this.appointmentRepo.count({
      where: {
        doctor: { doctor_id: availability.doctor.doctor_id },
        appointment_date: availability.date,
        session: availability.session,
        start_time: requestedSlot,
        appointment_status: 'confirmed',
      },
    });

    const maxWaveCapacity = 3; // You can make this configurable
    
    if (bookedCount >= maxWaveCapacity) {
      throw new ConflictException(
        `Time slot is full (Wave scheduling allows max ${maxWaveCapacity} patients per slot)`
      );
    }
  }

  // Get patient's appointments
  async getPatientAppointments(patientUserId: number) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: patientUserId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const appointments = await this.appointmentRepo.find({
      where: { patient: { patient_id: patient.patient_id } },
      relations: ['doctor'],
      order: { appointment_date: 'ASC', start_time: 'ASC' },
    });

    return appointments.map(apt => ({
      appointment_id: apt.appointment_id,
      date: apt.appointment_date,
      time: apt.start_time,
      doctor_name: apt.doctor.name,
      specialization: apt.doctor.specialization,
      status: apt.appointment_status,
      reason: apt.reason,
    }));
  }

  // Get doctor's appointments
  async getDoctorAppointments(doctorId: number) {
    const appointments = await this.appointmentRepo.find({
      where: { doctor: { doctor_id: doctorId } },
      relations: ['patient'],
      order: { appointment_date: 'ASC', start_time: 'ASC' },
    });

    return appointments.map(apt => ({
      appointment_id: apt.appointment_id,
      date: apt.appointment_date,
      time: apt.start_time,
      patient_name: `${apt.patient.first_name} ${apt.patient.last_name}`,
      status: apt.appointment_status,
      reason: apt.reason,
    }));
  }
}