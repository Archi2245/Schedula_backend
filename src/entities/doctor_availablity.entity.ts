import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Timeslot } from './timeslot.entity';


@Entity()
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilities)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ nullable: true })
  session: string; // "morning", "evening"

  @Column({ nullable: true })
  weekday: string; // Optional

  @OneToMany(() => Timeslot, (slot) => slot.availability)
  slots: Timeslot[];
}
