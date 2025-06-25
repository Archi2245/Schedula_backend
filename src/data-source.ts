import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointment.entity';
import { Timeslot } from './entities/timeslot.entity';
import { User } from './entities/user.entity';
import { DoctorAvailability } from './entities/doctor_availablity.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Doctor, Patient, User, Appointment, Timeslot, DoctorAvailability],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});

AppDataSource.initialize()
  .then(() => {
    console.log('Data Source has been initialized!');
  })
  .catch((err) => {
    console.error('Error during Data Source initialization:', err);
  });
