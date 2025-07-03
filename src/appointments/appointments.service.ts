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
  // ✅ IMPROVED: getDoctorAvailability with proper validation
async getDoctorAvailability(
    doctorId: number, 
    fromDate: string, 
    toDate: string,
    includeBookingDetails: boolean = true
  ) {
    // 1. Validate doctor exists
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    // 2. Validate date range
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (from < today) {
      throw new BadRequestException('Cannot query availability for past dates');
    }

    if (to <= from) {
      throw new BadRequestException('End date must be after start date');
    }

    // 3. Limit date range
    const maxDays = 90;
    const diffTime = Math.abs(to.getTime() - from.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > maxDays) {
      throw new BadRequestException(`Date range too large. Maximum ${maxDays} days allowed.`);
    }

    // 4. Get availabilities
    const availabilities = await this.availabilityRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        date: Between(fromDate, toDate)
      },
      relations: ['doctor'],
      order: { date: 'ASC', session: 'ASC' }
    });

    if (availabilities.length === 0) {
      return {
        message: 'No availability found for the specified date range',
        doctor_id: doctorId,
        doctor_name: doctor.name,
        schedule_type: doctor.schedule_type,
        date_range: { from: fromDate, to: toDate },
        availability: []
      };
    }

    // 5. Process availability with improved naming
    const processedAvailability = availabilities.map(availability => {
      this.validateDoctorSchedulingConfig(availability.doctor);
      
      const maxSlotsPerSlot = availability.doctor.schedule_type === 'stream' 
        ? 1 
        : availability.doctor.patients_per_slot;
      
      const reportingInterval = this.calculateReportingInterval(availability.doctor);
      
      // 🔥 IMPROVED: Better slot information with clearer naming
      const slotsWithAvailability = availability.time_slots.map(slot => {
        const bookedCount = availability.slot_bookings[slot] || 0;
        const availableSpots = maxSlotsPerSlot - bookedCount;
        
        return {
          slot_time: slot, // 🔥 RENAMED: Clear that this is the appointment slot time
          available_spots: availableSpots,
          total_capacity: maxSlotsPerSlot, // 🔥 RENAMED: Clearer than "total_spots"
          is_fully_booked: bookedCount >= maxSlotsPerSlot,
          current_bookings: bookedCount,
          reporting_interval_minutes: reportingInterval,
          schedule_type: availability.doctor.schedule_type,
          
          // 🔥 NEW: Additional helpful information
          next_reporting_time: this.calculateNextReportingTime(slot, bookedCount, reportingInterval),
          estimated_wait_time: this.estimateWaitTime(availability.doctor, bookedCount)
        };
      });

      return {
        date: availability.date,
        weekday: availability.weekday,
        session: availability.session,
        
        // 🔥 IMPROVED NAMING: More descriptive time fields
        session_start_time: availability.start_time, // When the session starts
        session_end_time: availability.end_time,     // When the session ends
        consulting_duration_per_patient: availability.doctor.consulting_time_per_patient, // 🔥 RENAMED
        slot_duration_minutes: availability.doctor.slot_duration, // 🔥 RENAMED: Duration of each booking slot
        
        schedule_type: availability.doctor.schedule_type,
        patients_per_slot: availability.doctor.patients_per_slot,
        reporting_interval_minutes: reportingInterval,
        
        // 🔥 CONDITIONAL: Include detailed booking info only if requested
        ...(includeBookingDetails && {
          available_slots: slotsWithAvailability.filter(slot => !slot.is_fully_booked),
          all_slots: slotsWithAvailability,
          total_available_spots: slotsWithAvailability.reduce((sum, slot) => sum + slot.available_spots, 0),
          total_slots: slotsWithAvailability.length,
          booking_summary: {
            total_capacity: slotsWithAvailability.reduce((sum, slot) => sum + slot.total_capacity, 0),
            current_bookings: slotsWithAvailability.reduce((sum, slot) => sum + slot.current_bookings, 0),
            utilization_percentage: Math.round(
              (slotsWithAvailability.reduce((sum, slot) => sum + slot.current_bookings, 0) /
               slotsWithAvailability.reduce((sum, slot) => sum + slot.total_capacity, 0)) * 100
            )
          }
        }),
        
        // 🔥 SIMPLIFIED: For basic availability queries (backward compatibility)
        ...(!includeBookingDetails && {
          available_time_slots: slotsWithAvailability
            .filter(slot => !slot.is_fully_booked)
            .map(slot => slot.slot_time)
        })
      };
    });

    return {
      doctor_id: doctorId,
      doctor_name: doctor.name,
      specialization: doctor.specialization,
      schedule_type: doctor.schedule_type,
      clinic_name: doctor.clinic_name,
      date_range: { from: fromDate, to: toDate },
      total_available_sessions: processedAvailability.length,
      
      // 🔥 IMPROVED: Summary statistics
      summary: {
        total_sessions: processedAvailability.length,
        total_bookable_slots: processedAvailability.reduce((sum, session) => 
          sum + (session.all_slots?.length || session.available_time_slots?.length || 0), 0),
        ...(includeBookingDetails && {
          total_capacity: processedAvailability.reduce((sum, session) => 
            sum + (session.booking_summary?.total_capacity || 0), 0),
          current_bookings: processedAvailability.reduce((sum, session) => 
            sum + (session.booking_summary?.current_bookings || 0), 0)
        })
      },
      
      availability: processedAvailability
    };
  }
  calculateNextReportingTime(slot: string, bookedCount: number, reportingInterval: number): any {
    throw new Error('Method not implemented.');
  }
  private estimateWaitTime(doctor: Doctor, currentBookings: number): number {
    // Estimate wait time based on current bookings and doctor's consulting time
    if (doctor.schedule_type === 'stream') {
      return 0; // No wait for stream scheduling
    }
    
    // For wave scheduling, estimate based on position in queue
    const reportingInterval = Math.floor(doctor.slot_duration / doctor.patients_per_slot);
    return Math.max(0, (currentBookings * reportingInterval) - reportingInterval);
  }

  private calculateReportingInterval(doctor: Doctor): number {
    if (doctor.schedule_type === 'stream') {
      return doctor.slot_duration; // Full slot duration for stream
    } else {
      // Wave: slot_duration / patients_per_slot
      return Math.floor(doctor.slot_duration / doctor.patients_per_slot);
    }
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
  // ✅ IMPROVED: Patient upcoming appointments with better filtering
async getPatientUpcomingAppointments(patientUserId: number, limit: number = 10) {
  const patient = await this.patientRepo.findOne({
    where: { user: { id: patientUserId } },
    relations: ['user']
  });

  if (!patient) {
    throw new NotFoundException('Patient profile not found');
  }

  // ✅ Better date range - next 6 months
  const now = new Date();
  const futureLimit = new Date();
  futureLimit.setMonth(futureLimit.getMonth() + 6);

  const appointments = await this.appointmentRepo.find({
    where: { 
      patient: { patient_id: patient.patient_id },
      scheduled_on: Between(now, futureLimit),
      appointment_status: In(['confirmed', 'pending'])
    },
    relations: ['doctor', 'doctor.user'],
    order: { scheduled_on: 'ASC' },
    take: limit
  });

  return {
    patient_id: patient.patient_id,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    total_upcoming: appointments.length,
    appointments: appointments.map(apt => ({
      appointment_id: apt.appointment_id,
      scheduled_on: apt.scheduled_on,
      reporting_time: apt.reporting_time, // ✅ Include reporting time
      doctor_name: apt.doctor.name,
      specialization: apt.doctor.specialization,
      clinic_name: apt.doctor.clinic_name,
      clinic_address: apt.doctor.clinic_address,
      status: apt.appointment_status,
      reason: apt.reason,
      slot_position: apt.slot_position,
      session: apt.session,
      duration_minutes: apt.duration_minutes,
      schedule_type: apt.doctor.schedule_type,
      time_interval_minutes: apt.time_interval_minutes,
      // ✅ Helpful computed fields
      is_today: format(apt.scheduled_on, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'),
      days_until_appointment: Math.ceil((apt.scheduled_on.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))
  };
}

// ✅ IMPROVED: Doctor upcoming appointments with patient info
async getDoctorUpcomingAppointments(doctorId: number, limit: number = 20) {
  const doctor = await this.doctorRepo.findOne({
    where: { doctor_id: doctorId },
    relations: ['user']
  });

  if (!doctor) {
    throw new NotFoundException('Doctor profile not found');
  }

  // ✅ Better date range - next 3 months for doctors
  const now = new Date();
  const futureLimit = new Date();
  futureLimit.setMonth(futureLimit.getMonth() + 3);

  const appointments = await this.appointmentRepo.find({
    where: { 
      doctor: { doctor_id: doctorId },
      scheduled_on: Between(now, futureLimit),
      appointment_status: In(['confirmed', 'pending'])
    },
    relations: ['patient', 'patient.user'],
    order: { scheduled_on: 'ASC' },
    take: limit
  });

  // ✅ Group appointments by date for better organization
  const appointmentsByDate = appointments.reduce((acc, apt) => {
    const dateKey = format(apt.scheduled_on, 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(apt);
    return acc;
  }, {} as Record<string, typeof appointments>);

  return {
    doctor_id: doctorId,
    doctor_name: doctor.name,
    specialization: doctor.specialization,
    schedule_type: doctor.schedule_type,
    total_upcoming: appointments.length,
    appointments_by_date: Object.entries(appointmentsByDate).map(([date, dayAppointments]) => ({
      date,
      weekday: format(new Date(date), 'EEEE'),
      appointment_count: dayAppointments.length,
      appointments: dayAppointments.map(apt => ({
        appointment_id: apt.appointment_id,
        scheduled_on: apt.scheduled_on,
        reporting_time: apt.reporting_time,
        patient_name: `${apt.patient.first_name} ${apt.patient.last_name}`,
        patient_email: apt.patient.user.email,
        status: apt.appointment_status,
        reason: apt.reason,
        slot_position: apt.slot_position,
        session: apt.session,
        duration_minutes: apt.duration_minutes,
        time_interval_minutes: apt.time_interval_minutes,
        // ✅ Computed fields for doctor's convenience
        scheduled_time: format(apt.scheduled_on, 'HH:mm'),
        reporting_time_formatted: apt.reporting_time ? format(apt.reporting_time, 'HH:mm') : '',
      }))
    }))
  };
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
      
      if (doctor.patients_per_slot !== 1) {
        throw new BadRequestException(
          'Stream scheduling must have exactly 1 patient per slot.'
        );
      }
    }
    
    // General validations
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

  // 🔥 WRAPPER METHODS: For backward compatibility
  async getAvailableSlots(doctorId: number, fromDate?: string, toDate?: string) {
    // Default to next 30 days if dates not provided
    const from = fromDate || format(new Date(), 'yyyy-MM-dd');
    const to = toDate || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    return this.getDoctorAvailability(doctorId, from, to, false); // Simple version
  }

  async getDetailedAvailability(doctorId: number, fromDate: string, toDate: string) {
    return this.getDoctorAvailability(doctorId, fromDate, toDate, true); // Detailed version
  }
}

