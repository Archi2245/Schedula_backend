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

  @Column({ type: 'date' })
  appointment_date: string; // Store as YYYY-MM-DD format

  @Column()
  weekday: string; // e.g., "Monday", "Tuesday"

  @Column()
  session: 'morning' | 'evening';

  @Column()
  start_time: string; // e.g., "10:00"

  @Column()
  end_time: string; // e.g., "12:00"

  @Column({ 
    type: 'enum', 
    enum: ['pending', 'confirmed', 'cancelled', 'completed'], 
    default: 'pending' 
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