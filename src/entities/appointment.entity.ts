import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  appointment_id: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduled_on: Date;

  @Column({ default: 15 })
  duration_minutes: number;

  @Column({ nullable: true })
  slot_position?: number;

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

  @Column({ type: 'timestamp', nullable: true })
  reporting_time: Date | null;

  @Column({ nullable: true })
  time_interval_minutes?: number;

  @ManyToOne(() => Doctor, doc => doc.appointments)
  doctor: Doctor;

  @ManyToOne(() => Patient, pat => pat.appointments)
  patient: Patient;

  @ManyToOne(() => TimeSlot, { nullable: true })
  timeSlot: TimeSlot;
  
}
