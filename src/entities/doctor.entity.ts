import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  OneToOne, JoinColumn
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { TimeSlot } from './time-slot.entity';
import { User } from './user.entity';
import { DoctorAvailability } from './doctor-availability.entity';

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  doctor_id: number;

  @OneToOne(() => User)
  @JoinColumn()
  user: User;

  @Column()
  name: string;

  @Column()
  specialization: string;

  @Column({ nullable: true })
  phone_number?: string;

  @Column({ nullable: true })
  experience_years?: number;

  @Column({ nullable: true })
  education?: string;

  @Column({ nullable: true })
  clinic_name?: string;

  @Column({ nullable: true })
  clinic_address?: string;

  @Column({ nullable: true })
  available_days?: string;

  @Column({ nullable: true })
  available_time_slots?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.doctor)
  timeSlots: TimeSlot[];

  @Column({ 
    type: 'enum', 
    enum: ['stream', 'wave'], 
    default: 'wave' 
  })
  schedule_type: 'stream' | 'wave';

  @OneToMany(() => DoctorAvailability, (availability) => availability.doctor)
  availabilities: DoctorAvailability[];

  // Wave: 30-minute slots with 3 patients = 10 min per patient
  // Stream: 10-minute slots with 1 patient = 10 min per patient
  @Column({ default: 15 })
  slot_duration: number;

  @Column({ default: 3 })
  patients_per_slot: number;

  @Column({ default: 10 })
  consulting_time_per_patient: number;


}
