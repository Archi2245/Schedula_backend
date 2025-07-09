import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class DoctorAvailability {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilities)
  doctor: Doctor;

  @Column({ type: 'date' })
  date: string;

  @Column()
  weekday: string;

  @Column()
  session: 'morning' | 'evening';

  @Column({ type: 'varchar', nullable: true, default: '09:00' })
  consulting_start_time: string;

  @Column({ type: 'varchar', nullable: true, default: '11:00' })
  consulting_end_time: string;

  @OneToMany(() => TimeSlot, (slot) => slot.availability, { cascade: true })
  slots: TimeSlot[];

  @Column({ type: 'varchar', default: 'active' })
  slot_status: 'active' | 'inactive';

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 🔍 Only keep consulting session logic
  isConsultingTimeValid(): boolean {
    if (!this.consulting_start_time || !this.consulting_end_time) return false;
    const start = new Date(`${this.date}T${this.consulting_start_time}`);
    const end = new Date(`${this.date}T${this.consulting_end_time}`);
    return start < end;
  }
}
