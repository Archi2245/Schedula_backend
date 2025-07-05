import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { DoctorAvailability } from 'src/entities/doctor-availability.entity';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      DoctorAvailability,
    ]),
    AppointmentsModule, // 🔥 NEW: Import appointments module for validation
  ],
  providers: [DoctorService],
  controllers: [DoctorController],
  exports: [DoctorService], // Optional, if you want to use it elsewhere
})
export class DoctorModule {}
