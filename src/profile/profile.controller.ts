import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Doctor } from 'src/entities/doctor.entity';
import { Patient } from 'src/entities/patient.entity';
import { Repository } from 'typeorm';

@Controller('api/v1')
export class ProfileController {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Get('doctor/profile')
  async getDoctorProfile(@Req() req: any) {
    const user_id = req.user.sub;
    console.log('Accessing Doctor User ID:', user_id);
    if (!user_id) {
      return { message: 'User ID not found in request' };
    }
    const doctor = await this.doctorRepository.findOne({
      where: { user: { user_id: user_id } },
      relations: ['user'],
    });

    if (!doctor) {
      return { message: 'Doctor profile not found' };
    }

    return {
      doctor_id: doctor.doctor_id,
      first_name: doctor.first_name,
      last_name: doctor.last_name,
      email: doctor.user.email,
      specialization: doctor.specialization,
      phone_number: doctor.phoneNumber,
      experience: doctor.experience_years,
      education: doctor.education,
      clinic_name: doctor.clinic_name,
      clinic_address: doctor.clinic_address,
      available_slots: doctor.availabilities,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('patient')
  @Get('patient/profile')
  async getPatientProfile(@Req() req: any) {
    const user_id = req.user.sub;
    console.log('Accessing Patient Profile User ID:', user_id);
    if (!user_id) {
      return { message: 'User ID not found in request' };
    }
    const patient = await this.patientRepository.findOne({
      where: { user: { user_id: user_id } },
      relations: ['user'],
    });
    if (!patient) {
      return { message: 'Patient profile not found' };
    }
    return {
      patient_id: patient.patient_id,
      first_name: patient.first_name,
      last_name: patient.last_name,
      email: patient.user.email,
      phone_number: patient.phone_number,
      gender: patient.gender,
      dob: patient.dob,
      patient_address: patient.patient_address,
      emergency_contact: patient.emergency_contact,
      medical_history: patient.medical_history,
    };
  }
}
