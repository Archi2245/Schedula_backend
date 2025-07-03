import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HelloWorldArchiModule } from './hello-world-archi/hello-world-archi.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';
import { AccessTokenGuard } from './auth/guard/access-token.guard';
import { DoctorController } from './doctor/doctor.controller';
import { PatientController } from './patient/patient.controller';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointment.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { ConfigModule } from '@nestjs/config';
import { DoctorService } from './doctor/doctor.service';
import { DoctorModule } from './doctor/doctor.module';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { AppDataSource } from './data-source'; 
import { AppointmentsModule } from './appointments/appointments.module';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
  type: 'postgres',
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
  synchronize: true, // This will fix all schema issues
  dropSchema: false, // Won't delete your data
  logging: true, // Show what's happening
}),
    TypeOrmModule.forFeature([Doctor, Patient, Appointment, TimeSlot, DoctorAvailability]),
    HelloWorldArchiModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DoctorModule,
    AppointmentsModule,
  ],

  controllers: [DoctorController, PatientController],

  providers: [DoctorService],
})
export class AppModule {}
