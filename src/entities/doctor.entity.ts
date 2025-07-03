import {
  Entity, PrimaryGeneratedColumn, Column, OneToMany,
  OneToOne, JoinColumn
} from 'typeorm';
import { Appointment } from './appointment.entity';
import { TimeSlot } from './time-slot.entity';
import { User } from './user.entity';
import { DoctorAvailability } from './doctor-availability.entity';

// Enhanced doctor.entity.ts with proper defaults

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

  // ✅ FIXED: Better defaults for wave scheduling
  @Column({ default: 30 }) // 30-minute slots work well for wave
  slot_duration: number;

  @Column({ default: 3 }) // 3 patients per 30-min slot = 10 min intervals
  patients_per_slot: number;

  @Column({ default: 10 }) // 10 minutes consulting time per patient
  consulting_time_per_patient: number;

  // ✅ NEW: Add validation constraint
  @Column({ type: 'boolean', default: true })
  is_configuration_valid: boolean;

  // ✅ NEW: Helper method to validate configuration
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (this.schedule_type === 'wave') {
      const interval = Math.floor(this.slot_duration / this.patients_per_slot);
      
      if (interval < this.consulting_time_per_patient) {
        errors.push(`Reporting interval (${interval} min) < consulting time (${this.consulting_time_per_patient} min)`);
      }
      
      if (interval < 5) {
        errors.push(`Reporting interval (${interval} min) too short. Minimum 5 minutes.`);
      }
      
      if (this.patients_per_slot < 2) {
        errors.push('Wave scheduling requires at least 2 patients per slot.');
      }
    }
    
    if (this.schedule_type === 'stream') {
      if (this.slot_duration < this.consulting_time_per_patient) {
        errors.push(`Slot duration (${this.slot_duration} min) < consulting time (${this.consulting_time_per_patient} min)`);
      }
      
      if (this.patients_per_slot !== 1) {
        errors.push('Stream scheduling must have exactly 1 patient per slot.');
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }
}