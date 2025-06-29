import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorService } from './doctor.service';
import { DoctorController } from './doctor.controller';
import { DoctorAvailability } from 'src/entities/doctor-availability.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Doctor, DoctorAvailability])],
  providers: [DoctorService],
  controllers: [DoctorController],
  exports: [DoctorService], // Optional, if you want to use it elsewhere
})
export class DoctorModule {}
