// src/entities/doctor-availability.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity()
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilities)
  doctor: Doctor;

  @Column({ type: 'date' }) // Remove nullable: true
  date: string;

  @Column()
  weekday: string;

  @Column()
  session: 'morning' | 'evening';

  @Column()
  start_time: string; // e.g., 10:00

  @Column()
  end_time: string; // e.g., 13:00

  // Fix for PostgreSQL - use json type instead of text array
  @Column({ 
    type: 'json',
    default: () => "'[]'" 
  })
  time_slots: string[];

  // Fix for PostgreSQL - use json type instead of simple-array
  @Column({ 
    type: 'json',
    default: () => "'[]'" 
  })
  booked_slots: string[];

  @CreateDateColumn()
  created_at: Date;
}
