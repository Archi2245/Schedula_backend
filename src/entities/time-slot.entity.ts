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

  @ManyToOne(() => DoctorAvailability, (availability) => availability.slots)
  availability: DoctorAvailability;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

@Column({ default: 'active' })
slot_status: 'active' | 'inactive';

@Column({ default: 0 })
current_bookings: number;

@Column({ default: false })
is_fully_booked: boolean;

@Column({ type: 'timestamp', nullable: true })
booking_start_time: Date;

@Column({ type: 'timestamp', nullable: true })
booking_end_time: Date;

isBookingWindowOpen(): boolean {
  const now = new Date();
  return (
    this.booking_start_time &&
    this.booking_end_time &&
    now >= this.booking_start_time &&
    now <= this.booking_end_time
  );
}

getReportingTimes(): string[] {
  const results: string[] = [];
  const totalPatients = this.patients_per_slot || 1;
  const duration = this.slot_duration_minutes || 15;
  const interval = Math.floor(duration / totalPatients);

  const [startHour, startMin] = this.start_time.split(':').map(Number);
  const start = new Date(0, 0, 0, startHour, startMin);

  for (let i = 0; i < totalPatients; i++) {
    const time = new Date(start.getTime() + i * interval * 60000);
    results.push(time.toTimeString().substring(0, 5)); // HH:MM
  }

  return results;
}


}
