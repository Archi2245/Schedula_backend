import {
<<<<<<< HEAD
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateAvailabilityDto } from 'src/dto/availablity.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('api/v1/doctors')
export class DoctorController {
  constructor(private doctorService: DoctorService) {}
  @UseGuards(JwtAuthGuard)
  @Get()
  getDoctors(
    @Query('name') name?: string,
    @Query('specialization') specialization?: string,
  ) {
    return this.doctorService.getDoctors(name, specialization);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getDoctorByID(@Param('id', ParseIntPipe) id: number) {
    return this.doctorService.getDoctorByID(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('doctor')
  @Post(':id/availability')
  async createAvailability(
    @Param('id') doctorId: number,
    @Body() dto: CreateAvailabilityDto,
  ) {
    return this.doctorService.createAvailability(doctorId, dto);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id/availability')
  async getAvailability(
    @Param('id') doctorId: number,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.doctorService.getAvailableSlots(doctorId, +page, +limit);
  }
=======
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
>>>>>>> main
}
