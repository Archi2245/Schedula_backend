import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { DoctorAvailability } from '../entities/doctor-availability.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { format, addMinutes, parseISO, isAfter } from 'date-fns';

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

  // Get all doctors for patient browsing
  async getAllDoctors() {
    const doctors = await this.doctorRepo.find({
      relations: ['user'],
      select: {
        doctor_id: true,
        name: true,
        specialization: true,
        experience_years: true,
        clinic_name: true,
        clinic_address: true,
        schedule_type: true,
        user: {
          id: true,
          email: true
        }
      }
    });

    return doctors.map(doctor => ({
      doctor_id: doctor.doctor_id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience_years: doctor.experience_years,
      clinic_name: doctor.clinic_name,
      clinic_address: doctor.clinic_address,
      schedule_type: doctor.schedule_type,
      email: doctor.user.email
    }));
  }

  //  Get specific doctor details
  async getDoctorDetails(doctorId: number) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    return {
      doctor_id: doctor.doctor_id,
      name: doctor.name,
      specialization: doctor.specialization,
      experience_years: doctor.experience_years,
      education: doctor.education,
      clinic_name: doctor.clinic_name,
      clinic_address: doctor.clinic_address,
      schedule_type: doctor.schedule_type,
      email: doctor.user.email
    };
  }

  // NEW: Get doctor's availability with real-time slot info
  async getDoctorAvailability(doctorId: number, fromDate: string, toDate: string) {
    const availabilities = await this.availabilityRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        date: Between(fromDate, toDate)
      },
      relations: ['doctor'],
      order: { date: 'ASC', session: 'ASC' }
    });

    return availabilities.map(availability => {
      const maxSlotsPerSlot = availability.doctor.schedule_type === 'stream' ? 1 : 3;
      
      const slotsWithAvailability = availability.time_slots.map(slot => {
        const bookedCount = availability.slot_bookings[slot] || 0;
        return {
          time: slot,
          available_spots: maxSlotsPerSlot - bookedCount,
          total_spots: maxSlotsPerSlot,
          is_fully_booked: bookedCount >= maxSlotsPerSlot
        };
      });

      return {
        date: availability.date,
        weekday: availability.weekday,
        session: availability.session,
        start_time: availability.start_time,
        end_time: availability.end_time,
        schedule_type: availability.doctor.schedule_type,
        available_slots: slotsWithAvailability.filter(slot => !slot.is_fully_booked),
        all_slots: slotsWithAvailability
      };
    });
  }

  //  ENHANCED: Create appointment with realistic scheduling
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

    // 3. Parse the scheduled datetime
    const scheduledDateTime = parseISO(dto.scheduled_on);
    const dateStr = format(scheduledDateTime, 'yyyy-MM-dd');
    const timeStr = format(scheduledDateTime, 'HH:mm');

    // 4. Validate appointment is not in the past
    if (!isAfter(scheduledDateTime, new Date())) {
      throw new BadRequestException('Cannot book appointments in the past');
    }

    // 5. Check if doctor has availability for the requested date/session
    const availability = await this.availabilityRepo.findOne({
      where: {
        doctor: { doctor_id: dto.doctor_id },
        date: dateStr,
        session: dto.session,
      },
      relations: ['doctor'],
    });

    if (!availability) {
      throw new BadRequestException(
        'Doctor is not available for the selected date and session'
      );
    }

    // 6. Validate that the requested time slot exists in doctor's availability
    if (!availability.time_slots.includes(timeStr)) {
      throw new BadRequestException(
        'Requested time slot is not available in doctor\'s schedule'
      );
    }

    // 7. 🔥 NEW: Validate one booking per session per day constraint
    await this.validateOneBookingPerSession(
      patient.patient_id,
      dto.doctor_id,
      dateStr,
      dto.session
    );

    // 8. Apply scheduling logic based on doctor's schedule_type
    let actualStartTime = scheduledDateTime;
    let slotPosition = 1;

    if (doctor.schedule_type === 'stream') {
      // STREAM: Only one appointment per slot
      await this.handleStreamScheduling(availability, timeStr);
    } else if (doctor.schedule_type === 'wave') {
      // WAVE: Multiple appointments per slot (max 3)
      const result = await this.handleWaveScheduling(availability, scheduledDateTime);
      actualStartTime = result.actualStartTime;
      slotPosition = result.position;
    }

    // 9. Create the appointment
    const appointment = this.appointmentRepo.create({
      scheduled_on: actualStartTime,
      weekday: dto.weekday,
      session: dto.session,
      duration_minutes: 15, // Standard 15-minute appointments
      slot_position: slotPosition,
      reason: dto.reason,
      notes: dto.notes,
      doctor: doctor,
      patient: patient,
      appointment_status: 'confirmed',
    });

    const savedAppointment = await this.appointmentRepo.save(appointment);

    // 10. Update availability slot_bookings
    if (!availability.slot_bookings) {
      availability.slot_bookings = {};
    }

    availability.slot_bookings[timeStr] = (availability.slot_bookings[timeStr] || 0) + 1;
    await this.availabilityRepo.save(availability);

    return {
      message: 'Appointment booked successfully',
      appointment: {
        appointment_id: savedAppointment.appointment_id,
        scheduled_on: savedAppointment.scheduled_on,
        doctor_name: doctor.name,
        specialization: doctor.specialization,
        status: savedAppointment.appointment_status,
        slot_position: savedAppointment.slot_position,
        duration_minutes: savedAppointment.duration_minutes
      },
    };
  }

  //  NEW: Validate one booking per session per day
  private async validateOneBookingPerSession(
    patientId: number,
    doctorId: number,
    scheduledDate: string,
    session: 'morning' | 'evening'
  ): Promise<void> {
    const existingBooking = await this.appointmentRepo.findOne({
      where: {
        patient: { patient_id: patientId },
        doctor: { doctor_id: doctorId },
        scheduled_on: Between(
          new Date(`${scheduledDate}T00:00:00.000Z`),
          new Date(`${scheduledDate}T23:59:59.999Z`)
        ),
        session: session,
        appointment_status: In(['confirmed', 'pending'])
      }
    });

    if (existingBooking) {
      throw new ConflictException(
        `You already have an appointment with this doctor in the ${session} session on ${scheduledDate}`
      );
    }
  }

  // Handle Stream Scheduling (1 patient per slot)
  private async handleStreamScheduling(
    availability: DoctorAvailability,
    requestedSlot: string,
  ) {
    const currentBookings = availability.slot_bookings[requestedSlot] || 0;

    if (currentBookings > 0) {
      throw new ConflictException(
        'Time slot is already booked (Stream scheduling allows only 1 patient per slot)'
      );
    }
  }

  //  ENHANCED: Handle Wave Scheduling with realistic time assignment
  private async handleWaveScheduling(
    availability: DoctorAvailability,
    requestedDateTime: Date,
  ): Promise<{ position: number; actualStartTime: Date }> {
    const slotKey = format(requestedDateTime, 'HH:mm');
    const currentBookings = availability.slot_bookings[slotKey] || 0;
    
    if (currentBookings >= 3) {
      throw new ConflictException('Time slot is fully booked (max 3 patients)');
    }
    
    const position = currentBookings + 1;
    let actualStartTime = requestedDateTime;
    
    // Wave scheduling time assignment based on real medical practices
    if (position === 1) {
      // First patient gets exact slot time
      actualStartTime = requestedDateTime;
    } else if (position === 2) {
      // Second patient gets +15 minutes within the same 30-minute window
      actualStartTime = addMinutes(requestedDateTime, 15);
    } else if (position === 3) {
      // Third patient gets same time as first (overlapping wave)
      actualStartTime = requestedDateTime;
    }
    
    return { position, actualStartTime };
  }

  //  NEW: Get patient's upcoming appointments
  async getPatientUpcomingAppointments(patientUserId: number) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: patientUserId } },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    const appointments = await this.appointmentRepo.find({
      where: { 
        patient: { patient_id: patient.patient_id },
        scheduled_on: Between(new Date(), new Date('2026-12-31')), // Future appointments
        appointment_status: In(['confirmed', 'pending'])
      },
      relations: ['doctor'],
      order: { scheduled_on: 'ASC' },
    });

    return appointments.map(apt => ({
      appointment_id: apt.appointment_id,
      scheduled_on: apt.scheduled_on,
      doctor_name: apt.doctor.name,
      specialization: apt.doctor.specialization,
      clinic_name: apt.doctor.clinic_name,
      status: apt.appointment_status,
      reason: apt.reason,
      slot_position: apt.slot_position,
      session: apt.session
    }));
  }

  //  NEW: Get doctor's upcoming appointments
  async getDoctorUpcomingAppointments(doctorId: number) {
    const appointments = await this.appointmentRepo.find({
      where: { 
        doctor: { doctor_id: doctorId },
        scheduled_on: Between(new Date(), new Date('2026-12-31')), // Future appointments
        appointment_status: In(['confirmed', 'pending'])
      },
      relations: ['patient'],
      order: { scheduled_on: 'ASC' },
    });

    return appointments.map(apt => ({
      appointment_id: apt.appointment_id,
      scheduled_on: apt.scheduled_on,
      patient_name: `${apt.patient.first_name} ${apt.patient.last_name}`,
      status: apt.appointment_status,
      reason: apt.reason,
      slot_position: apt.slot_position,
      session: apt.session,
      duration_minutes: apt.duration_minutes
    }));
  }

  //  NEW: Helper to get doctor ID from user ID
  async getDoctorIdByUserId(userId: number): Promise<number> {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctor.doctor_id;
  }

  // Legacy method for backward compatibility
  async getPatientAppointments(patientUserId: number) {
    return this.getPatientUpcomingAppointments(patientUserId);
  }

  // Legacy method for backward compatibility  
  async getDoctorAppointments(doctorId: number) {
    return this.getDoctorUpcomingAppointments(doctorId);
  }
}