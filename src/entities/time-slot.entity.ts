import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne
} from 'typeorm';
import { Doctor } from './doctor.entity';

@Entity()
export class TimeSlot {
  @PrimaryGeneratedColumn()
  slot_id: number;

  @Column() day_of_week: string;
  @Column() start_time: string;
  @Column() end_time: string;

  @ManyToOne(() => Doctor, doc => doc.timeSlots)
  doctor: Doctor;
}
