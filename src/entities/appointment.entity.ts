import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  appointment_id: number;

  // 🔥 CHANGE: Combined date and time into one field
  @Column({ type: 'timestamp' })
  scheduled_on: Date; // Stores both date and time

  @Column()
  weekday: string; // e.g., "Monday", "Tuesday"

  @Column()
  session: 'morning' | 'evening';

  // 🔥 CHANGE: Duration in minutes instead of end_time
  @Column({ default: 15 })
  duration_minutes: number; // 15 minutes for most appointments

  // 🔥 NEW: Slot position for wave scheduling
  @Column({ nullable: true })
  slot_position?: number; // 1, 2, 3 for wave scheduling order

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'confirmed' 
  })
  appointment_status: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Doctor, doc => doc.appointments)
  doctor: Doctor;

  @ManyToOne(() => Patient, pat => pat.appointments)
  patient: Patient;
}