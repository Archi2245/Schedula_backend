import {
<<<<<<< HEAD
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { Timeslot } from './timeslot.entity';
import { User } from './user.entity';
import { DoctorAvailability } from './doctor_availablity.entity';
=======
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  OneToOne, JoinColumn
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { TimeSlot } from './time-slot.entity';
import { User } from './user.entity';
import { DoctorAvailability } from './doctor-availability.entity';
>>>>>>> main

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  doctor_id: number;

  @OneToOne(() => User)
<<<<<<< HEAD
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  specialization: string;

  @Column({ type: 'int', default: 0 })
  experience_years: number;

  @Column({ type: 'text', nullable: true })
  education: string;

  @Column({ type: 'text', nullable: true })
  clinic_name: string;

  @Column({ type: 'text', nullable: true })
  clinic_address: string;
=======
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
>>>>>>> main

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

<<<<<<< HEAD
  @OneToMany(() => Timeslot, (slot) => slot.doctor)
  timeslots: Timeslot[];

  @OneToMany(() => DoctorAvailability, (availability) => availability.doctor)
  availabilities: DoctorAvailability[];
=======
  @OneToMany(() => TimeSlot, (timeSlot) => timeSlot.doctor)
  timeSlots: TimeSlot[];

  @OneToMany(() => DoctorAvailability, (availability) => availability.doctor)
availabilities: DoctorAvailability[];
>>>>>>> main
}
