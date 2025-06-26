import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Param,
  Query,
  Body
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { DoctorService } from './doctor.service';
import { Doctor } from '../entities/doctor.entity';
import { Public } from '../common/decorators/public.decorator';
import { CreateAvailabilityDto } from './dto/create-availability.dto'; // ✅ your DTO

@Controller('doctor')
@UseGuards(AccessTokenGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('profile')
  @Roles(Role.DOCTOR)
  getDoctorProfile(@Req() req) {
    return { message: 'Welcome Doctor', user: req.user };
  }

  @Get()
  @Public()
  async getAllDoctors(@Query('search') search?: string): Promise<Doctor[]> {
    return this.doctorService.findAll(search);
  }

  @Get(':id')
  @Public()
  async getDoctorById(@Param('id') id: string): Promise<Doctor> {
    return this.doctorService.findOne(+id);
  }

  @Post(':id/availability')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  async setAvailability(
    @Param('id') doctorId: string,
    @Body() dto: CreateAvailabilityDto
  ) {
    return this.doctorService.createAvailability(+doctorId, dto);
  }

@Get(':id/availability')
@Roles(Role.PATIENT) // Only for patients
@UseGuards(AccessTokenGuard, RolesGuard)
async getDoctorAvailability(
  @Param('id') doctorId: string,
  @Query('page') page = 1,
  @Query('limit') limit = 5,
) {
  return this.doctorService.getAvailableSlots(+doctorId);
}
}
