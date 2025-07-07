import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes, ValidationPipe,
  Req,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { GetCurrentUserId } from '../auth/decorator/get-current-user-id.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('appointments')
@UseGuards(AccessTokenGuard, RolesGuard)
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  // POST /appointments - Book an appointment (Patients only)
  @Post()
  @Roles(Role.PATIENT)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
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
    return this.appointmentsService.getPatientUpcomingAppointments(userId);
  }

  // GET /appointments/doctor - Get doctor's appointments
  @Get('doctor')
  @Roles(Role.DOCTOR)
  async getDoctorAppointments(@GetCurrentUserId() userId: number) {
    const doctorId = await this.appointmentsService.getDoctorIdByUserId(userId);
    return this.appointmentsService.getDoctorUpcomingAppointments(doctorId);
  }

  // 🔥 CONSOLIDATED: Single endpoint for doctor availability
  // GET /appointments/doctors/:doctorId/availability
  @Get('doctors/:doctorId/availability')
  @Public() // Allow both patients and public access
  async getDoctorAvailability(
    @Param('doctorId') doctorId: number,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
    @Query('detailed') detailed?: string // ?detailed=true for booking details
  ) {
    // Default to next 30 days if not specified
    const from = fromDate || new Date().toISOString().split('T')[0];
    const to = toDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const includeBookingDetails = detailed === 'true';
    
    return this.appointmentsService.getDoctorAvailability(doctorId, from, to, includeBookingDetails);
  }

  // 🔥 SIMPLIFIED: Get all doctors with basic info
  @Get('doctors')
  @Public()
  async getAllDoctors() {
    return this.appointmentsService.getAllDoctors();
  }

  // 🔥 SIMPLIFIED: Get specific doctor details
  @Get('doctors/:doctorId')
  @Public()
  async getDoctorDetails(@Param('doctorId') doctorId: number) {
    return this.appointmentsService.getDoctorDetails(doctorId);
  }

  // GET /appointments/view-appointments - Unified appointment view
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

  // (Optional) Check if appointments exist in a time range for a slot
@Get('check-slot-conflict')
@Roles(Role.DOCTOR)
async checkSlotConflict(
  @Query('doctorId') doctorId: number,
  @Query('date') date: string,
  @Query('start') startTime: string,
  @Query('end') endTime: string,
) {
  const conflict = await this.appointmentsService.hasAppointmentsInSlot(
    Number(doctorId),
    date,
    startTime,
    endTime,
  );

  return { conflict };
}
}