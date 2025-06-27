<<<<<<< HEAD
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
=======
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
>>>>>>> main
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';

@Entity()
export class Appointment {
  @PrimaryGeneratedColumn()
  appointment_id: number;

<<<<<<< HEAD
  @ManyToOne(()=> Doctor, (doctor) => doctor.appointments)
  @JoinColumn({name: 'doctor_id'})
  doctor: Doctor;

  @ManyToOne(()=> Patient, (patient)=> patient.appointments)
  @JoinColumn({name: 'patient_id'})
  patient: Patient;

  @Column()
  appointment_date: Date;

  @Column()
  time_slot: string;

  @Column()
  appointment_status: string;

  @Column()
  reason: string;

  @Column('text')
  notes: string;

  @Column({type: 'timestamp', default: ()=> 'CURRENT_TIMESTAMP'})
  created_at: Date;

  @Column({type: 'timestamp', default: ()=> 'CURRENT_TIMESTAMP'})
  updated_at: Date;

=======
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
>>>>>>> main
}
