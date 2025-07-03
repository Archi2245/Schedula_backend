import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointment.entity';
import { User } from './entities/user.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  // Use DATABASE_URL if available (for production), otherwise use individual connection params
  ...(process.env.DATABASE_URL 
    ? {
        url: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
  ),
  entities: [Doctor, Patient, User, Appointment, TimeSlot, DoctorAvailability],
  migrations: [],  // NO MIGRATIONS - we'll use synchronize
  synchronize: true, // FORCE SYNC - this will fix all schema issues
  dropSchema: false, // DON'T DROP EXISTING DATA
  logging: true, // Show what's happening
});