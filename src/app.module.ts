import { Module } from '@nestjs/common';
<<<<<<< HEAD
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Timeslot } from './entities/timeslot.entity';
import { Appointment } from './entities/appointment.entity';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { User } from './entities/user.entity';
import { ProfileController } from './profile/profile.controller';
import { DoctorController } from './doctor/doctor.controller';
import { DoctorService } from './doctor/doctor.service';
import { DoctorModule } from './doctor/doctor.module';
import { DoctorAvailability } from './entities/doctor_availablity.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      synchronize: false, // Set to false due to production best practices
      autoLoadEntities: true, // Automatically load entities
    }),

    TypeOrmModule.forFeature([
      Doctor,
      Patient,
      User,
      Timeslot,
      Appointment,
      DoctorAvailability,
    ]),

    AuthModule,

    DoctorModule,
  ],

  controllers: [
    AppController,
    AuthController,
    ProfileController,
    DoctorController,
  ],
  providers: [AppService, AuthService, DoctorService],
=======
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
import { AppDataSource } from './typeorm.config'; 

@Module({
  imports: [
    TypeOrmModule.forRoot(AppDataSource.options),
    TypeOrmModule.forFeature([Doctor, Patient, Appointment, TimeSlot, DoctorAvailability]),
    HelloWorldArchiModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DoctorModule,
  ],

  controllers: [DoctorController, PatientController],

  providers: [DoctorService],
>>>>>>> main
})
export class AppModule {}
