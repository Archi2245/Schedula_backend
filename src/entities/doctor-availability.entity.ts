import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { TimeSlot } from './time-slot.entity';

@Entity()
export class DoctorAvailability {
  booking_start_time: any;
  booking_end_time: Date | undefined;
  isBookingWindowOpen(): unknown {
    throw new Error('Method not implemented.');
  }
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

  isBookingWindowValid(bookingStart: Date, bookingEnd: Date): boolean {
    const consultingStart = new Date(`${this.date}T${this.consulting_start_time}`);
    return (
      bookingStart < consultingStart &&
      bookingEnd < consultingStart &&
      bookingStart < bookingEnd
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

}
