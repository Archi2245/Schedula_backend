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

  // 🔥 REMOVED: Global slot configuration (now per-slot)
  // These are now set individually for each slot in DoctorAvailability
  
  // 🔥 NEW: Default consulting time per patient (used for validation)
  @Column({ default: 10 })
  default_consulting_time_per_patient: number;

  // 🔥 NEW: Helper method to validate if doctor can create slots
  canCreateSlots(): { canCreate: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!this.schedule_type) {
      errors.push('Doctor must have a schedule_type set (stream or wave)');
    }
    
    if (!this.default_consulting_time_per_patient || this.default_consulting_time_per_patient < 5) {
      errors.push('Doctor must have a valid default_consulting_time_per_patient (minimum 5 minutes)');
    }
    
    return { canCreate: errors.length === 0, errors };
  }

  // 🔥 NEW: Helper method to get default patients per slot based on schedule type
  getDefaultPatientsPerSlot(): number {
    return this.schedule_type === 'stream' ? 1 : 3;
  }
}