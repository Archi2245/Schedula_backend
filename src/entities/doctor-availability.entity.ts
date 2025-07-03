import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn,
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

  @Column("text", { array: true, nullable: true })
  booked_slots: string[];

  @Column()
  start_time: string; // e.g., "09:00"

  @Column()
  end_time: string; // e.g., "12:00"

  // 🔥 NEW: Enhanced slot management
  @Column({ 
    type: 'json',
    default: () => "'[]'" 
  })
  time_slots: string[]; // ["09:00", "09:15", "09:30", ...]

  // 🔥 NEW: Detailed booking tracking
  @Column({ 
    type: 'json',
    default: () => "'{}'" 
  })
  slot_bookings: Record<string, number>; // {"09:00": 2, "09:15": 1} - count per slot

  // 🔥 NEW: Maximum capacity per slot based on schedule type
  @Column({ default: 1 })
  max_patients_per_slot: number; // 1 for stream, 3 for wave

  @CreateDateColumn()
  created_at: Date;
}