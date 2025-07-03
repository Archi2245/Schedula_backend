import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
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

  //  POST /appointments - Book an appointment (Patients only)
  @Post()
  @Roles(Role.PATIENT)
  async createAppointment(
    @GetCurrentUserId() userId: number,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.createAppointment(userId, dto);
  }

  // GET /appointments/patient - Get patient's appointments
  @Get('patient')
  @Roles(Role.PATIENT)
  async getPatientAppointments(@GetCurrentUserId() userId: number) {
    return this.appointmentsService.getPatientAppointments(userId);
  }

  //  GET /appointments/doctor - Get doctor's appointments
  @Get('doctor')
  @Roles(Role.DOCTOR)
  async getDoctorAppointments(@Req() req) {
    return { message: 'Doctor appointments endpoint - implement doctor ID lookup' };
  }

  //  Get all doctors with basic info
@Get('doctors')
async getAllDoctors() {
  return this.appointmentsService.getAllDoctors();
}

//  Get specific doctor details
@Get('doctors/:doctorId')
async getDoctorDetails(@Param('doctorId') doctorId: number) {
  return this.appointmentsService.getDoctorDetails(doctorId);
}

//  Get doctor's availability for specific date range
@Get('doctors/:doctorId/availability')
async getDoctorAvailability(
  @Param('doctorId') doctorId: number,
  @Query('from') fromDate: string,
  @Query('to') toDate: string,
) {
  return this.appointmentsService.getDoctorAvailability(doctorId, fromDate, toDate);
}

@Get('view-appointments')
  async getUpcomingAppointments(@GetCurrentUserId() userId: number, @Req() req) {
    const userRole = req.user.role;
    
    if (userRole === Role.PATIENT) {
      return this.appointmentsService.getPatientUpcomingAppointments(userId);
    } else if (userRole === Role.DOCTOR) {
      const doctorId = await this.appointmentsService.getDoctorIdByUserId(userId);
      return this.appointmentsService.getDoctorUpcomingAppointments(doctorId);
    }
    
    throw new Error('Invalid user role');
  }
}
