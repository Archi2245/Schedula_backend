import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './typeorm.config';
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

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([Doctor, Patient, Appointment, TimeSlot, DoctorAvailability]),
    HelloWorldArchiModule,
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DoctorModule,
  ],

  controllers: [DoctorController, PatientController],

  providers: [DoctorService],
})
export class AppModule {}
