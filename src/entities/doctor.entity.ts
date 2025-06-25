import {
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

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  doctor_id: number;

  @OneToOne(() => User)
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

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => Timeslot, (slot) => slot.doctor)
  timeslots: Timeslot[];

  @OneToMany(() => DoctorAvailability, (availability) => availability.doctor)
  availabilities: DoctorAvailability[];
}
