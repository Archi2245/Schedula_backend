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

  @Column()
  date: string; // YYYY-MM-DD

  @Column()
  weekday: string;

  @Column()
  session: 'morning' | 'evening';

  @Column()
  start_time: string; // e.g., 10:00

  @Column()
  end_time: string; // e.g., 13:00

  @Column('simple-array')
  time_slots: string[]; // ["10:00", "10:15", "10:30", ...]

  @Column('simple-array', { default: '' })
  booked_slots: string[]; // ["10:00", "10:15"]

  @CreateDateColumn()
  created_at: Date;
}
