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
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Controller('appointments')
@UseGuards(AccessTokenGuard, RolesGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

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

// ✅ DOCTOR: View upcoming/past/cancelled appointments
@Get('doctor/:doctorId/status')
@Roles(Role.DOCTOR)
async getDoctorAppointmentsByStatus(
  @Param('doctorId', ParseIntPipe) doctorId: number,
  @Query('status') status: 'upcoming' | 'past' | 'cancelled',
  @Req() req,
) {
  if (doctorId !== req.user.sub) {
    throw new ForbiddenException('Unauthorized access');
  }
  return this.appointmentsService.getAppointmentsByStatus(doctorId, Role.DOCTOR, status);
}

}
