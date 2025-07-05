import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';

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

  // 🔥 RENAMED: Consulting time period
  @Column()
  consulting_start_time: string; // e.g., "09:00"

  @Column()
  consulting_end_time: string; // e.g., "10:00"

  // 🔥 NEW: Booking window (when patients can book this slot)
  @Column({ type: 'timestamp' })
  booking_start_time: Date; // When booking opens

  @Column({ type: 'timestamp' })
  booking_end_time: Date; // When booking closes

  // 🔥 NEW: Manually set by doctor for each slot
  @Column()
  patients_per_slot: number; // e.g., 3 patients for this specific slot

  // 🔥 NEW: Calculated field - slot duration in minutes
  @Column()
  slot_duration_minutes: number; // consulting_end_time - consulting_start_time

  // 🔥 NEW: Calculated field - reporting interval for wave scheduling
  @Column()
  reporting_interval_minutes: number; // slot_duration / patients_per_slot

  // 🔥 NEW: Current booking count for this slot
  @Column({ default: 0 })
  current_bookings: number;

  // 🔥 NEW: Track if slot is fully booked
  @Column({ default: false })
  is_fully_booked: boolean;

  // 🔥 NEW: Booking tracking with patient positions
  @Column({ 
    type: 'json',
    default: () => "'{}'" 
  })
  slot_bookings: Record<string, {
    patient_id: number;
    appointment_id: number;
    position: number; // 1, 2, 3 for wave scheduling
    reporting_time: string; // calculated based on position
  }>;

  @Column({ 
    type: 'enum', 
    enum: ['active', 'cancelled', 'completed'], 
    default: 'active' 
  })
  slot_status: 'active' | 'cancelled' | 'completed';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  time_slots: any;
  appointments: any;

  // 🔥 NEW: Helper method to check if slot can be modified
  canBeModified(): boolean {
    return this.current_bookings === 0;
  }

  // 🔥 NEW: Helper method to check if booking window is open
  isBookingWindowOpen(): boolean {
    const now = new Date();
    return now >= this.booking_start_time && now <= this.booking_end_time;
  }

  // 🔥 NEW: Helper method to get available spots
  getAvailableSpots(): number {
    return this.patients_per_slot - this.current_bookings;
  }

  // 🔥 NEW: Helper method to calculate reporting times for wave scheduling
  getReportingTimes(): string[] {
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
}