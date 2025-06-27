<<<<<<< HEAD
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';
=======
import { Entity, PrimaryGeneratedColumn, Column, OneToOne } from 'typeorm';
import { Role } from '../types/roles.enum';
>>>>>>> main

@Entity()
export class User {
  @PrimaryGeneratedColumn()
<<<<<<< HEAD
  user_id: number;
=======
  id: number;
>>>>>>> main

  @Column({ unique: true })
  email: string;

<<<<<<< HEAD
  @Column({ type: 'text', nullable: true })
  password: string | null;

  @Column({ type: 'enum', enum: ['doctor', 'patient'], default: 'patient' })
  role: 'doctor' | 'patient';
=======
  @Column({ nullable: true })
  password: string;

  @Column({ type: 'text', nullable: true })
  hashedRefreshToken?: string | null;
>>>>>>> main

  @Column({ type: 'enum', enum: ['local', 'google'], default: 'local' })
  provider: 'local' | 'google';

<<<<<<< HEAD
  @Column({ type: 'text', nullable: true })
  hashed_refresh_token: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updated_at: Date;

  @OneToOne(() => Doctor, (doctor) => doctor.user)
  doctor: Doctor;

  @OneToOne(() => Patient, (patient) => patient.user)
  patient: Patient;

=======
  @Column({
    type: 'enum',
    enum: Role,
  })
  role: Role;

  @Column({ type: 'varchar', nullable: true })  // 👈 Add this
  name?: string;
>>>>>>> main
}
