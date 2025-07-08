import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { DoctorAvailability } from './doctor-availability.entity';

@Entity()
export class TimeSlot {
  @PrimaryGeneratedColumn()
  slot_id: number;

  @Column({ type: 'date' })
  date: string; // 🔥 Actual slot date

  @Column()
  day_of_week: string;

  @Column({ type: 'varchar' })
  start_time: string;

  @Column({ type: 'varchar' })
  end_time: string;

  @Column({ default: 1 })
  patients_per_slot: number;

  @Column({ default: 30 }) // e.g. 30 minutes per slot
  slot_duration_minutes: number;

  @Column({ default: false })
  is_fully_booked: boolean;

  @Column({
    type: 'json',
    nullable: true,
    default: () => "'{}'",
  })
  slot_bookings: Record<string, {
    patient_id: number;
    appointment_id: number;
    position: number;
    reporting_time: string;
  }>;

  @ManyToOne(() => Doctor, (doc) => doc.timeSlots)
  doctor: Doctor;

  @ManyToOne(() => DoctorAvailability, (availability) => availability.id)
  availability: DoctorAvailability; // 🔥 Link to parent session

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ default: 0 })
  current_bookings: number;

}
