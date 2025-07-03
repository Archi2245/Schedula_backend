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
    // Validate doctor's configuration before processing
    this.validateDoctorSchedulingConfig(availability.doctor);
    
    // Use doctor's actual configuration
    const maxSlotsPerSlot = availability.doctor.schedule_type === 'stream' 
      ? 1 
      : availability.doctor.patients_per_slot;
    
    const reportingInterval = this.calculateReportingInterval(availability.doctor);
    
    const slotsWithAvailability = availability.time_slots.map(slot => {
      const bookedCount = availability.slot_bookings[slot] || 0;
      return {
        time: slot,
        available_spots: maxSlotsPerSlot - bookedCount,
        total_spots: maxSlotsPerSlot,
        is_fully_booked: bookedCount >= maxSlotsPerSlot,
        reporting_interval_minutes: reportingInterval,
        schedule_type: availability.doctor.schedule_type
      };
    });

    return {
      date: availability.date,
      weekday: availability.weekday,
      session: availability.session,
      start_time: availability.start_time,
      end_time: availability.end_time,
      schedule_type: availability.doctor.schedule_type,
      slot_duration: availability.doctor.slot_duration,
      patients_per_slot: availability.doctor.patients_per_slot,
      consulting_time_per_patient: availability.doctor.consulting_time_per_patient,
      reporting_interval_minutes: reportingInterval,
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

    // 8. Apply scheduling logic based on doctor's configuration
  let actualStartTime = scheduledDateTime;
  let slotPosition = 1;

  if (doctor.schedule_type === 'stream') {
    // STREAM: Use doctor's preferred slot duration
    const result = await this.handleStreamScheduling(availability, timeStr, doctor);
    actualStartTime = result.actualStartTime;
    slotPosition = result.position;
  } else if (doctor.schedule_type === 'wave') {
    // WAVE: Use doctor's configurable time blocks and patient limits
    const result = await this.handleWaveScheduling(availability, scheduledDateTime, doctor);
    actualStartTime = result.actualStartTime;
    slotPosition = result.position;
  }

  // 9. Create the appointment with enhanced scheduling info
  const appointment = this.appointmentRepo.create({
    scheduled_on: scheduledDateTime, // Original requested time slot
    reporting_time: actualStartTime, // ✅ Actual time patient should arrive
    weekday: dto.weekday,
    session: dto.session,
    duration_minutes: doctor.consulting_time_per_patient,
    slot_position: slotPosition,
    time_interval_minutes: this.calculateReportingInterval(doctor),
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
      reporting_time: savedAppointment.reporting_time, // ✅ Include reporting time
      doctor_name: doctor.name,
      specialization: doctor.specialization,
      status: savedAppointment.appointment_status,
      slot_position: savedAppointment.slot_position,
      duration_minutes: savedAppointment.duration_minutes,
      schedule_type: doctor.schedule_type,
      time_interval_minutes: savedAppointment.time_interval_minutes
    },
  };
}

  private calculateReportingInterval(doctor: Doctor): number {
  if (doctor.schedule_type === 'stream') {
    return doctor.slot_duration; // Full slot duration for stream
  } else {
    // Wave: slot_duration / patients_per_slot
    return Math.floor(doctor.slot_duration / doctor.patients_per_slot);
  }
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
  doctor: Doctor
): Promise<{ position: number; actualStartTime: Date }> {
  const currentBookings = availability.slot_bookings[requestedSlot] || 0;

  if (currentBookings > 0) {
    throw new ConflictException(
      `Time slot is already booked (Stream scheduling allows only 1 patient per ${doctor.slot_duration}-minute slot)`
    );
  }
  
  // Stream: patient arrives exactly at scheduled time
  return { 
    position: 1, 
    actualStartTime: parseISO(`${availability.date}T${requestedSlot}:00.000Z`)
  };
}

  //  ENHANCED: Handle Wave Scheduling with realistic time assignment
  
private async handleWaveScheduling(
  availability: DoctorAvailability,
  requestedDateTime: Date,
  doctor: Doctor
): Promise<{ position: number; actualStartTime: Date }> {
  const slotKey = format(requestedDateTime, 'HH:mm');
  
  // ✅ Get current bookings for this specific slot
  const currentBookings = availability.slot_bookings[slotKey] || 0;
  
  // ✅ Use doctor's configurable patients per slot
  const maxPatients = doctor.patients_per_slot;
  
  if (currentBookings >= maxPatients) {
    throw new ConflictException(
      `Time slot ${slotKey} is fully booked (max ${maxPatients} patients per ${doctor.slot_duration}-minute block)`
    );
  }
  
  // ✅ Calculate position (1st, 2nd, 3rd patient in this slot)
  const position = currentBookings + 1;
  
  // ✅ Calculate reporting interval dynamically
  const reportingInterval = Math.floor(doctor.slot_duration / doctor.patients_per_slot);
  
  // ✅ Calculate actual reporting time based on position
  const minutesToAdd = (position - 1) * reportingInterval;
  const actualStartTime = addMinutes(requestedDateTime, minutesToAdd);
  
  console.log(`Wave Scheduling Debug:
    - Slot: ${slotKey}
    - Current bookings: ${currentBookings}
    - Position: ${position}
    - Reporting interval: ${reportingInterval} min
    - Original time: ${format(requestedDateTime, 'HH:mm')}
    - Actual reporting time: ${format(actualStartTime, 'HH:mm')}
  `);
  
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

  
private validateDoctorSchedulingConfig(doctor: Doctor): void {
  // Validate wave scheduling
  if (doctor.schedule_type === 'wave') {
    const reportingInterval = Math.floor(doctor.slot_duration / doctor.patients_per_slot);
    
    if (reportingInterval < doctor.consulting_time_per_patient) {
      throw new BadRequestException(
        `Invalid wave configuration: Reporting interval (${reportingInterval} min) is less than consulting time per patient (${doctor.consulting_time_per_patient} min). ` +
        `Either increase slot_duration (${doctor.slot_duration}) or decrease patients_per_slot (${doctor.patients_per_slot}).`
      );
    }
    
    if (reportingInterval < 5) {
      throw new BadRequestException(
        `Invalid wave configuration: Reporting interval (${reportingInterval} min) is too short. Minimum 5 minutes between patients required.`
      );
    }
    
    // ✅ NEW: Validate patients_per_slot for wave
    if (doctor.patients_per_slot < 2) {
      throw new BadRequestException(
        'Wave scheduling requires at least 2 patients per slot. Use stream scheduling for single patients.'
      );
    }
  }
  
  // Validate stream scheduling
  if (doctor.schedule_type === 'stream') {
    if (doctor.slot_duration < doctor.consulting_time_per_patient) {
      throw new BadRequestException(
        `Invalid stream configuration: Slot duration (${doctor.slot_duration} min) is less than consulting time per patient (${doctor.consulting_time_per_patient} min).`
      );
    }
    
    // ✅ NEW: Ensure stream uses 1 patient per slot
    if (doctor.patients_per_slot !== 1) {
      throw new BadRequestException(
        'Stream scheduling must have exactly 1 patient per slot.'
      );
    }
  }
  
  // ✅ NEW: General validations
  if (doctor.slot_duration < 5 || doctor.slot_duration > 120) {
    throw new BadRequestException(
      'Slot duration must be between 5 and 120 minutes.'
    );
  }
  
  if (doctor.consulting_time_per_patient < 5 || doctor.consulting_time_per_patient > 60) {
    throw new BadRequestException(
      'Consulting time per patient must be between 5 and 60 minutes.'
    );
  }
  
  if (doctor.patients_per_slot < 1 || doctor.patients_per_slot > 10) {
    throw new BadRequestException(
      'Patients per slot must be between 1 and 10.'
    );
  }
}

}