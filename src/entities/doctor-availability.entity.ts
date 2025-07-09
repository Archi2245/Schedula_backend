import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class DoctorAvailability {
  
@Column({ type: 'timestamp', nullable: false, default: () => 'NOW()' })
booking_start_time: Date;

@Column({ type: 'timestamp', nullable: false, default: () => 'NOW()' })
booking_end_time: Date;

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'active' })
  slot_status: 'active' | 'inactive';


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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  patients_per_slot: number | undefined;
  slot_duration_minutes: number;
  reporting_interval_minutes: number;

  // 🧠 Utils
  isConsultingTimeValid(): boolean {
    if (!this.consulting_start_time || !this.consulting_end_time) return false;
    const start = new Date(`${this.date}T${this.consulting_start_time}`);
    const end = new Date(`${this.date}T${this.consulting_end_time}`);
    return start < end;
  }

  isBookingWindowOpen(): boolean {
  const now = new Date();
  return (
    this.booking_start_time instanceof Date &&
    this.booking_end_time instanceof Date &&
    this.booking_start_time <= now &&
    now <= this.booking_end_time
  );
}


  @Column({ default: 0 })
  current_bookings: number;

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

getReportingTimes(): string[] {
  const interval = this.reporting_interval_minutes ?? 10;
  const result: string[] = [];
  const [startHour, startMin] = this.consulting_start_time.split(':').map(Number);
  const [endHour, endMin] = this.consulting_end_time.split(':').map(Number);
  const start = new Date(`${this.date}T${this.consulting_start_time}`);
  const end = new Date(`${this.date}T${this.consulting_end_time}`);

  const totalMinutes = (end.getTime() - start.getTime()) / 60000;
  const slots = Math.floor(totalMinutes / interval);

  for (let i = 0; i < slots; i++) {
    const time = new Date(start.getTime() + i * interval * 60000);
    result.push(time.toTimeString().substring(0, 5)); // HH:MM
  }

  return result;
}

getAvailableSpots(): number {
  return Math.max(0, (this.patients_per_slot ?? 1) - (this.current_bookings ?? 0));
}


}
