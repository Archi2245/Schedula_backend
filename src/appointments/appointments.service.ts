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

  // 🔥 NEW: Check if slot has any appointments - Critical for slot validation
  async hasAppointmentsInSlot(slotId: number, date: string, startTime: string, endTime: string): Promise<boolean> {
    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId },
      relations: ['doctor']
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    // Check if any appointments exist within this slot's time range
    const appointmentCount = await this.appointmentRepo.count({
      where: {
        doctor: { doctor_id: slot.doctor.doctor_id },
        scheduled_on: Between(
          new Date(`${slot.date}T${slot.consulting_start_time}:00.000Z`),
          new Date(`${slot.date}T${slot.consulting_end_time}:00.000Z`)
        ),
        appointment_status: In(['confirmed', 'pending'])
      }
    });

    return appointmentCount > 0;
  }

  // 🔥 NEW: Check if doctor has any appointments on specific date and time range
  async hasAppointmentsInTimeRange(
    doctorId: number, 
    date: string, 
    startTime: string, 
    endTime: string
  ): Promise<{
    hasAppointments: boolean;
    appointmentCount: number;
    appointments?: any[];
  }> {
    const startDateTime = new Date(`${date}T${startTime}:00.000Z`);
    const endDateTime = new Date(`${date}T${endTime}:00.000Z`);

    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        scheduled_on: Between(startDateTime, endDateTime),
        appointment_status: In(['confirmed', 'pending'])
      },
      relations: ['patient', 'patient.user'],
      order: { scheduled_on: 'ASC' }
    });

    return {
      hasAppointments: appointments.length > 0,
      appointmentCount: appointments.length,
      appointments: appointments.map(apt => ({
        appointment_id: apt.appointment_id,
        scheduled_on: apt.scheduled_on,
        patient_name: `${apt.patient.first_name} ${apt.patient.last_name}`,
        reason: apt.reason,
        status: apt.appointment_status
      }))
    };
  }

  // 🔥 NEW: Validate slot modification - Called by doctor service
  async validateSlotModification(slotId: number): Promise<{
    canModify: boolean;
    reason?: string;
    conflictingAppointments?: any[];
  }> {
    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId },
      relations: ['doctor']
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    const result = await this.hasAppointmentsInTimeRange(
      slot.doctor.doctor_id,
      slot.date,
      slot.consulting_start_time,
      slot.consulting_end_time
    );

    if (result.hasAppointments) {
      return {
        canModify: false,
        reason: `Cannot modify this slot because ${result.appointmentCount} appointment(s) are already booked in this session.`,
        conflictingAppointments: result.appointments
      };
    }

    return { canModify: true };
  }

  // 🔥 NEW: Get appointments for a specific slot - For doctor's reference
  async getAppointmentsForSlot(slotId: number) {
    const slot = await this.availabilityRepo.findOne({
      where: { id: slotId },
      relations: ['doctor']
    });

    if (!slot) {
      throw new NotFoundException(`Slot with ID ${slotId} not found`);
    }

    const appointments = await this.appointmentRepo.find({
      where: {
        doctor: { doctor_id: slot.doctor.doctor_id },
        scheduled_on: Between(
          new Date(`${slot.date}T${slot.consulting_start_time}:00.000Z`),
          new Date(`${slot.date}T${slot.consulting_end_time}:00.000Z`)
        ),
        appointment_status: In(['confirmed', 'pending'])
      },
      relations: ['patient', 'patient.user'],
      order: { scheduled_on: 'ASC' }
    });

    return {
      slot_id: slotId,
      slot_date: slot.date,
      slot_time: `${slot.consulting_start_time} - ${slot.consulting_end_time}`,
      total_appointments: appointments.length,
      appointments: appointments.map(apt => ({
        appointment_id: apt.appointment_id,
        scheduled_on: apt.scheduled_on,
        reporting_time: apt.reporting_time,
        patient_name: `${apt.patient.first_name} ${apt.patient.last_name}`,
        patient_email: apt.patient.user.email,
        reason: apt.reason,
        status: apt.appointment_status,
        slot_position: apt.slot_position
      }))
    };
  }

  // 🔥 UPDATED: Create appointment with enhanced slot validation
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
        slot_status: 'active' // 🔥 UPDATED: Only allow booking in active slots
      },
      relations: ['doctor'],
    });

    if (!availability) {
      throw new BadRequestException(
        'Doctor is not available for the selected date and session, or the slot is inactive'
      );
    }

    // 6. 🔥 UPDATED: Check if slot is within booking window
    if (!availability.isBookingWindowOpen()) {
      throw new BadRequestException(
        'Booking window for this slot is closed'
      );
    }

    // 7. Validate that the requested time slot exists in doctor's availability
    const reportingTimes = availability.getReportingTimes();
    const isValidTime = reportingTimes.includes(timeStr);
    
    if (!isValidTime) {
      throw new BadRequestException(
        'Requested time slot is not available in doctor\'s schedule'
      );
    }

    // 8. 🔥 UPDATED: Check available spots using entity method
    const availableSpots = availability.getAvailableSpots();
    if (availableSpots <= 0) {
      throw new ConflictException(
        'This time slot is fully booked'
      );
    }

    // 9. Validate one booking per session per day constraint
    await this.validateOneBookingPerSession(
      patient.patient_id,
      dto.doctor_id,
      dateStr,
      dto.session
    );

    // 10. Apply scheduling logic based on doctor's configuration
    let actualStartTime = scheduledDateTime;
    let slotPosition = 1;

    if (doctor.schedule_type === 'stream') {
      const result = await this.handleStreamScheduling(availability, timeStr, doctor);
      actualStartTime = result.actualStartTime;
      slotPosition = result.position;
    } else if (doctor.schedule_type === 'wave') {
      const result = await this.handleWaveScheduling(availability, scheduledDateTime, doctor);
      actualStartTime = result.actualStartTime;
      slotPosition = result.position;
    }

    // 11. Create the appointment
    const appointment = this.appointmentRepo.create({
      scheduled_on: scheduledDateTime,
      reporting_time: actualStartTime,
      weekday: dto.weekday,
      session: dto.session,
      duration_minutes: doctor.consulting_time_per_patient,
      slot_position: slotPosition,
      time_interval_minutes: availability.reporting_interval_minutes,
      reason: dto.reason,
      notes: dto.notes,
      doctor: doctor,
      patient: patient,
      appointment_status: 'confirmed',
    });

    const savedAppointment = await this.appointmentRepo.save(appointment);

    // 12. 🔥 UPDATED: Update slot bookings and check if fully booked
    availability.current_bookings += 1;
    availability.is_fully_booked = availability.current_bookings >= availability.patients_per_slot;
    
    if (!availability.slot_bookings) {
  availability.slot_bookings = {};
}

// Get current bookings for this time slot
const currentSlotBookings = availability.slot_bookings[timeStr] || {};
const currentBookingCount = Object.keys(currentSlotBookings).length;

// Generate a unique key for this booking (using patient_id and appointment_id)
const bookingKey = `${patient.patient_id}_${savedAppointment.appointment_id}`;

// Add the new booking
availability.slot_bookings[timeStr] = {
  ...currentSlotBookings,
  [bookingKey]: {
    patient_id: patient.patient_id,
    appointment_id: savedAppointment.appointment_id,
    position: slotPosition,
    reporting_time: format(actualStartTime, 'HH:mm')
  }
};

await this.availabilityRepo.save(availability);

    return {
      message: 'Appointment booked successfully',
      appointment: {
        appointment_id: savedAppointment.appointment_id,
        scheduled_on: savedAppointment.scheduled_on,
        reporting_time: savedAppointment.reporting_time,
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

  // Get specific doctor details
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

  // 🔥 UPDATED: Get doctor's availability with new slot structure
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

    // 3. Get availabilities (only active slots)
    const availabilities = await this.availabilityRepo.find({
      where: {
        doctor: { doctor_id: doctorId },
        date: Between(fromDate, toDate),
        slot_status: 'active' // 🔥 UPDATED: Only show active slots
      },
      relations: ['doctor'],
      order: { date: 'ASC', session: 'ASC' }
    });

    if (availabilities.length === 0) {
      return {
        message: 'No active availability found for the specified date range',
        doctor_id: doctorId,
        doctor_name: doctor.name,
        schedule_type: doctor.schedule_type,
        date_range: { from: fromDate, to: toDate },
        availability: []
      };
    }

    // 4. Process availability with new slot structure
    const processedAvailability = availabilities.map(availability => {
      const reportingTimes = availability.getReportingTimes();
      const availableSpots = availability.getAvailableSpots();
      
      return {
        slot_id: availability.id, // 🔥 NEW: Include slot ID
        date: availability.date,
        weekday: availability.weekday,
        session: availability.session,
        
        consulting_start_time: availability.consulting_start_time,
        consulting_end_time: availability.consulting_end_time,
        patients_per_slot: availability.patients_per_slot,
        slot_duration_minutes: availability.slot_duration_minutes,
        reporting_interval_minutes: availability.reporting_interval_minutes,
        
        current_bookings: availability.current_bookings,
        available_spots: availableSpots,
        is_fully_booked: availability.is_fully_booked,
        slot_status: availability.slot_status,
        
        // 🔥 NEW: Booking window info
        booking_window: {
          start: availability.booking_start_time,
          end: availability.booking_end_time,
          is_open: availability.isBookingWindowOpen()
        },
        
        // 🔥 UPDATED: Use entity method for reporting times
        available_reporting_times: reportingTimes,
        
        ...(includeBookingDetails && {
          detailed_slot_info: {
            slot_bookings: availability.slot_bookings,
            can_be_modified: availability.canBeModified(),
            total_capacity: availability.patients_per_slot,
            utilization_percentage: Math.round((availability.current_bookings / availability.patients_per_slot) * 100)
          }
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
      total_available_slots: processedAvailability.length,
      availability: processedAvailability
    };
  }

  // NEW: Validate one booking per session per day
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
  private async handleWaveScheduling(
  availability: DoctorAvailability,
  requestedDateTime: Date,
  doctor: Doctor
): Promise<{ position: number; actualStartTime: Date }> {
  const slotKey = format(requestedDateTime, 'HH:mm');
  
  // Get current bookings for this specific slot
  const slotBookings = availability.slot_bookings[slotKey] || {};
  const currentBookings = Object.keys(slotBookings).length;
  
  // Use doctor's configurable patients per slot
  const maxPatients = doctor.patients_per_slot;
  
  if (currentBookings >= maxPatients) {
    throw new ConflictException(
      `Time slot ${slotKey} is fully booked (max ${maxPatients} patients per ${doctor.slot_duration}-minute block)`
    );
  }
  
  // Calculate position (1st, 2nd, 3rd patient in this slot)
  const position = currentBookings + 1;
  
  // Calculate reporting interval dynamically
  const reportingInterval = Math.floor(doctor.slot_duration / doctor.patients_per_slot);
  
  // Calculate actual reporting time based on position
  const minutesToAdd = (position - 1) * reportingInterval;
  const actualStartTime = addMinutes(requestedDateTime, minutesToAdd);
  
  return { position, actualStartTime };
}

// Update handleStreamScheduling method as well:
private async handleStreamScheduling(
  availability: DoctorAvailability,
  requestedSlot: string,
  doctor: Doctor
): Promise<{ position: number; actualStartTime: Date }> {
  const slotBookings = availability.slot_bookings[requestedSlot] || {};
  const currentBookings = Object.keys(slotBookings).length;

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

  // Rest of the methods remain the same...
  async getPatientUpcomingAppointments(patientUserId: number, limit: number = 10) {
    const patient = await this.patientRepo.findOne({
      where: { user: { id: patientUserId } },
      relations: ['user']
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

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
        reporting_time: apt.reporting_time,
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
        is_today: format(apt.scheduled_on, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd'),
        days_until_appointment: Math.ceil((apt.scheduled_on.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  async getDoctorUpcomingAppointments(doctorId: number, limit: number = 20) {
    const doctor = await this.doctorRepo.findOne({
      where: { doctor_id: doctorId },
      relations: ['user']
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

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
          scheduled_time: format(apt.scheduled_on, 'HH:mm'),
          reporting_time_formatted: apt.reporting_time ? format(apt.reporting_time, 'HH:mm') : '',
        }))
      }))
    };
  }

  async getDoctorIdByUserId(userId: number): Promise<number> {
    const doctor = await this.doctorRepo.findOne({
      where: { user: { id: userId } },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return doctor.doctor_id;
  }

  // Legacy methods for backward compatibility
  async getPatientAppointments(patientUserId: number) {
    return this.getPatientUpcomingAppointments(patientUserId);
  }

  async getDoctorAppointments(doctorId: number) {
    return this.getDoctorUpcomingAppointments(doctorId);
  }

  async getAvailableSlots(doctorId: number, fromDate?: string, toDate?: string) {
    const from = fromDate || format(new Date(), 'yyyy-MM-dd');
    const to = toDate || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
    
    return this.getDoctorAvailability(doctorId, from, to, false);
  }

  async getDetailedAvailability(doctorId: number, fromDate: string, toDate: string) {
    return this.getDoctorAvailability(doctorId, fromDate, toDate, true);
  }

  // ✅ FINAL: Used to block session/slot edits if any booking exists in session
async hasAppointmentsInSession(
  doctorId: number,
  sessionDate: string,
  consultingStart: string,
  consultingEnd: string
): Promise<boolean> {
  const startDateTime = new Date(`${sessionDate}T${consultingStart}:00.000Z`);
  const endDateTime = new Date(`${sessionDate}T${consultingEnd}:00.000Z`);

  const count = await this.appointmentRepo.count({
    where: {
      doctor: { doctor_id: doctorId },
      scheduled_on: Between(startDateTime, endDateTime),
      appointment_status: In(['confirmed', 'pending']),
    },
  });

  return count > 0;
}
}