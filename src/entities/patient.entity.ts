import {
<<<<<<< HEAD
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  JoinColumn,
=======
  Entity, PrimaryGeneratedColumn, Column,
  OneToMany, CreateDateColumn, UpdateDateColumn,
  OneToOne, JoinColumn
>>>>>>> main
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { User } from './user.entity';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  patient_id: number;

  @OneToOne(() => User)
<<<<<<< HEAD
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone_number: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'date', nullable: true })
  dob: Date;

  @Column({ nullable: true })
  patient_address: string;

  @Column({ nullable: true })
  emergency_contact: string;

  @Column({ type: 'text', nullable: true })
  medical_history: string;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
=======
  @JoinColumn()
  user: User;
  
  @Column({ nullable: true }) first_name?: string;
  @Column({ nullable: true }) last_name?: string;
  @Column({ nullable: true }) phone_number?: string;
  @Column({ nullable: true }) gender?: string;
  @Column({ type: 'date', nullable: true }) dob?: Date;
  @Column({ nullable: true }) address?: string;
  @Column({ nullable: true }) emergency_contact?: string;
  @Column({ type: 'text', nullable: true }) medical_history?: string;


  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;

  @OneToMany(() => Appointment, appt => appt.patient)
>>>>>>> main
  appointments: Appointment[];
}
