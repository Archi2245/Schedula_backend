import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { DoctorAvailability } from './doctor_availablity.entity';

@Entity()
export class Timeslot {
  @PrimaryGeneratedColumn()
  slot_id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.timeslots)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => DoctorAvailability, (availability) => availability.slots, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'availability_id' })
  availability: DoctorAvailability;

  @Column({ type: 'date' })
  slot_date: Date;

  @Column({ type: 'time' })
  slot_time: string;

  @Column({ default: true })
  is_available: boolean;

  @Column({ nullable: true })
  session: string;
}
