import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Doctor } from 'src/entities/doctor.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RescheduleAppointmentsDto } from './dto/reschedule-appointments.dto';

@Controller('appointments')
@UseGuards(AccessTokenGuard, RolesGuard)
export class AppointmentsController {
  constructor(
    
    private readonly appointmentsService: AppointmentsService, 
    
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,) {}

  // ✅ PATIENT BOOKS APPOINTMENT
  @Post()
  @Roles(Role.PATIENT)
  async createAppointment(@Body() dto: CreateAppointmentDto, @Req() req) {
    return this.appointmentsService.create(dto, req.user.sub, dto.slot_id);
  }

  // ✅ PATIENT VIEWS HIS APPOINTMENTS
  @Get('patient')
  @Roles(Role.PATIENT)
  async getPatientAppointments(@Req() req) {
    return this.appointmentsService.getPatientAppointments(req.user.sub);
  }

  // ✅ DOCTOR VIEWS APPOINTMENTS IN HIS SLOTS
  @Get('doctor/:doctorId')
  @Roles(Role.DOCTOR)
  async getDoctorAppointments(@Param('doctorId', ParseIntPipe) doctorId: number, @Req() req) {
    if (doctorId !== req.user.sub) {
      throw new ForbiddenException('You can only view your own appointments');
    }
    return this.appointmentsService.getDoctorAppointments(doctorId);
  }

  // ✅ DOCTOR MARKS APPOINTMENT AS COMPLETED
  @Patch(':appointmentId/complete')
  @Roles(Role.DOCTOR)
  async markAsCompleted(@Param('appointmentId', ParseIntPipe) appointmentId: number, @Req() req) {
    return this.appointmentsService.markAsCompleted(appointmentId, req.user.sub);
  }

  // ✅ PATIENT CANCELS HIS APPOINTMENT
  @Patch(':appointmentId/cancel')
  @Roles(Role.PATIENT)
  async cancelAppointment(@Param('appointmentId', ParseIntPipe) appointmentId: number, @Req() req) {
    return this.appointmentsService.cancelAppointment(appointmentId, req.user.sub);
  }

  // ✅ DOCTOR CANCELS AN APPOINTMENT
@Patch(':appointmentId/cancel-by-doctor')
@Roles(Role.DOCTOR)
async cancelByDoctor(
  @Param('appointmentId', ParseIntPipe) appointmentId: number,
  @Req() req,
) {
  return this.appointmentsService.cancelAppointmentByDoctor(appointmentId, req.user.sub);
}

// ✅ PATIENT: View upcoming/past/cancelled appointments
@Get('patient/status')
@Roles(Role.PATIENT)
async getPatientAppointmentsByStatus(
  @Query('status') status: 'upcoming' | 'past' | 'cancelled',
  @Req() req,
) {
  return this.appointmentsService.getAppointmentsByStatus(req.user.sub, Role.PATIENT, status);
}

@Get('doctor/:doctorId/status')
@Roles(Role.DOCTOR)
async getDoctorAppointmentsByStatus(
  @Param('doctorId', ParseIntPipe) doctorId: number,
  @Query('status') status: 'upcoming' | 'past' | 'cancelled',
  @Req() req,
) {
  const doctor = await this.doctorRepo.findOne({
    where: { user: { id: req.user.sub } },
  });

  if (!doctor || doctor.doctor_id !== doctorId) {
    throw new ForbiddenException('Unauthorized access');
  }

  return this.appointmentsService.getAppointmentsByStatus(doctorId, Role.DOCTOR, status);
}

// PATCH /appointments/reschedule-all
@Patch('reschedule-all')
@Roles(Role.DOCTOR)
async rescheduleAllAppointments(
  @Body() dto: RescheduleAppointmentsDto,
  @Req() req,
) {
  return this.appointmentsService.rescheduleAllAppointments(req.user.sub, dto.shift_minutes);
}

// PATCH /appointments/reschedule-selected
@Patch('reschedule-selected')
@Roles(Role.DOCTOR)
async rescheduleSelectedAppointments(
  @Body() dto: RescheduleAppointmentsDto,
  @Req() req,
) {
  if (!dto.appointment_ids) {
    throw new BadRequestException('appointment_ids must be provided');
  }

  return this.appointmentsService.rescheduleSelectedAppointments(
    req.user.sub,
    dto.appointment_ids,
    dto.shift_minutes,
  );
}

}
