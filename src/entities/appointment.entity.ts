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

  @Column() appointment_date: Date;
  @Column() time_slot: string;
  @Column() appointment_status: string;
  @Column({ type: 'text' }) reason: string;
  @Column({ type: 'text' }) notes: string;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @ManyToOne(() => Doctor, doc => doc.appointments)
  doctor: Doctor;

  @ManyToOne(() => Patient, pat => pat.appointments)
  patient: Patient;
}
