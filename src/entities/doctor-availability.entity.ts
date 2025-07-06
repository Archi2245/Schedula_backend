import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Appointment } from './appointment.entity';

@Entity()
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilities)
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string;

  @Column()
  weekday: string;

  @Column()
  session: 'morning' | 'evening';

  // 🔥 RENAMED: Consulting time period - allow nullable for migration
  @Column({
    type: 'varchar',
    nullable: true,   
    default: '09:00'
  })
  consulting_start_time: string;

  // 🔥 CHANGE: Allow nullable for migration
  @Column({
    type: 'varchar',
    nullable: true,  
    default: '11:00'
  })
  consulting_end_time: string;

  // 🔥 NEW: Booking window (when patients can book this slot)
  @Column({ 
    type: 'timestamp',
    nullable: true  
  })
  booking_start_time: Date;

  @Column({ 
    type: 'timestamp',
    nullable: true  
  })
  booking_end_time: Date;

  // 🔥 NEW: Manually set by doctor for each slot
  @Column({
    nullable: true,  
    default: 1
  })
  patients_per_slot: number;

  // 🔥 NEW: Calculated field - slot duration in minutes
  @Column({
    nullable: true,  
    default: 60
  })
  slot_duration_minutes: number;

  // 🔥 NEW: Calculated field - reporting interval for wave scheduling
  @Column({
    nullable: true,  
    default: 60
  })
  reporting_interval_minutes: number;

  // 🔥 NEW: Current booking count for this slot
  @Column({ 
    default: 0,
    nullable: true  
  })
  current_bookings: number;

  // 🔥 NEW: Track if slot is fully booked
  @Column({ 
    default: false,
    nullable: true  
  })
  is_fully_booked: boolean;

  // 🔥 NEW: Booking tracking with patient positions
  @Column({ 
    type: 'json',
    nullable: true,  
    default: () => "'{}'" 
  })
  slot_bookings: Record<string, {
    patient_id: number;
    appointment_id: number;
    position: number;
    reporting_time: string;
  }>;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'cancelled', 'completed'], 
    default: 'active',
    nullable: true  
  })
  slot_status: 'active' | 'cancelled' | 'completed';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  
  // 🔥 LEGACY: Keep these for backward compatibility
  time_slots: any;
  appointments: any;

  // 🔥 NEW: Helper method to check if slot can be modified
  canBeModified(): boolean {
    return (this.current_bookings || 0) === 0;
  }

  // 🔥 NEW: Helper method to check if booking window is open
  isBookingWindowOpen(): boolean {
    if (!this.booking_start_time || !this.booking_end_time) {
      return false; 
    }
    const now = new Date();
    return now >= this.booking_start_time && now <= this.booking_end_time;
  }

  // 🔥 NEW: Helper method to get available spots
  getAvailableSpots(): number {
    const patientsPerSlot = this.patients_per_slot || 1;
    const currentBookings = this.current_bookings || 0;
    return patientsPerSlot - currentBookings;
  }

  // 🔥 NEW: Helper method to calculate reporting times for wave scheduling
  getReportingTimes(): string[] {
    // 👈 CHANGE: Handle null values
    if (!this.consulting_start_time || !this.patients_per_slot || !this.reporting_interval_minutes) {
      return [];
    }

    const times: string[] = [];
    const [startH, startM] = this.consulting_start_time.split(':').map(Number);
    let currentMinutes = startH * 60 + startM;
    
    for (let i = 0; i < this.patients_per_slot; i++) {
      const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const m = (currentMinutes % 60).toString().padStart(2, '0');
      times.push(`${h}:${m}`);
      currentMinutes += this.reporting_interval_minutes;
    }
    
    return times;
  }

  hasBookingsInSession(appointments: Appointment[]): boolean {
  const sessionStart = new Date(`${this.date}T${this.consulting_start_time}`);
  const sessionEnd = new Date(`${this.date}T${this.consulting_end_time}`);

  return appointments.some(apt => {
    const aptTime = new Date(apt.scheduled_on);
    return aptTime >= sessionStart && aptTime < sessionEnd;
  });
}
}