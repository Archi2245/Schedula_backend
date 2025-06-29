import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { GetCurrentUserId } from '../auth/decorator/get-current-user-id.decorator';

@Controller('appointments')
@UseGuards(AccessTokenGuard, RolesGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // 📍 POST /appointments - Book an appointment (Patients only)
  @Post()
  @Roles(Role.PATIENT)
  async createAppointment(
    @GetCurrentUserId() userId: number,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(userId, dto);
  }

  // 📍 GET /appointments/patient - Get patient's appointments
  @Get('patient')
  @Roles(Role.PATIENT)
  async getPatientAppointments(@GetCurrentUserId() userId: number) {
    return this.appointmentsService.getPatientAppointments(userId);
  }

  // 📍 GET /appointments/doctor - Get doctor's appointments
  @Get('doctor')
  @Roles(Role.DOCTOR)
  async getDoctorAppointments(@Req() req) {
    // You'll need to get doctor ID from the user. 
    // This assumes you have a way to get doctor profile from user ID
    // You might need to modify this based on your user-doctor relationship
    return { message: 'Doctor appointments endpoint - implement doctor ID lookup' };
  }
}