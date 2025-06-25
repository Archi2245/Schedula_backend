import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from 'src/entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { Timeslot } from 'src/entities/timeslot.entity';
import { DoctorAvailability } from 'src/entities/doctor_availablity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor,Timeslot, DoctorAvailability])],
  controllers: [DoctorController],
  providers: [DoctorService],
})
export class DoctorModule {}
