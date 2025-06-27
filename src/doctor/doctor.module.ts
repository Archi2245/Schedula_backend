import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
<<<<<<< HEAD
import { Doctor } from 'src/entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { Timeslot } from 'src/entities/timeslot.entity';
import { DoctorAvailability } from 'src/entities/doctor_availablity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor,Timeslot, DoctorAvailability])],
  controllers: [DoctorController],
  providers: [DoctorService],
=======
import { Doctor } from '../entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { DoctorAvailability } from 'src/entities/doctor-availability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, DoctorAvailability])],
  providers: [DoctorService],
  controllers: [DoctorController],
  exports: [DoctorService], // Optional, if you want to use it elsewhere
>>>>>>> main
})
export class DoctorModule {}
