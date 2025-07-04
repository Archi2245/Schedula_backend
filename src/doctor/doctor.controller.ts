import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  UseGuards,
  Patch,
  Req,
  Param,
  Query,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { DoctorService } from './doctor.service';
import { Doctor } from '../entities/doctor.entity';
import { Public } from '../common/decorators/public.decorator';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { UpdateScheduleTypeDto } from './dto/update-schedule-type.dto';

@Controller('doctor')
@UseGuards(AccessTokenGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // 👤 Doctor profile
  @Get('profile')
  @Roles(Role.DOCTOR)
  getDoctorProfile(@Req() req) {
    return { message: 'Welcome Doctor', user: req.user };
  }

  // 🔍 Get all doctors (public)
  @Get()
  @Public()
  async getAllDoctors(@Query('search') search?: string): Promise<Doctor[]> {
    return this.doctorService.findAll(search);
  }

  // 🔍 Get doctor by ID (public)
  @Get(':id')
  @Public()
  async getDoctorById(@Param('id', ParseIntPipe) id: number): Promise<Doctor> {
    return this.doctorService.findOne(id);
  }

  // 🔄 Update doctor's schedule type
  @Patch(':id/schedule-type')
  @Roles(Role.DOCTOR)
  async updateScheduleType(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: UpdateScheduleTypeDto,
    @Req() req
  ) {
    return this.doctorService.updateScheduleType(doctorId, dto, req.user.sub);
  }

  // 🔥 NEW: Create individual slot
  @Post(':id/slots')
  @Roles(Role.DOCTOR)
  async createSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: CreateSlotDto,
    @Req() req
  ) {
    return this.doctorService.createSlot(doctorId, dto, req.user.sub);
  }

  // 🔥 NEW: Update slot
  @Put(':id/slots/:slotId')
  @Roles(Role.DOCTOR)
  async updateSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: UpdateSlotDto,
    @Req() req
  ) {
    return this.doctorService.updateSlot(doctorId, slotId, dto, req.user.sub);
  }

  // 🔥 NEW: Delete slot
  @Delete(':id/slots/:slotId')
  @Roles(Role.DOCTOR)
  async deleteSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Req() req
  ) {
    return this.doctorService.deleteSlot(doctorId, slotId, req.user.sub);
  }

  // 🔥 NEW: Get doctor's own slots (for doctor management)
  @Get(':id/slots')
  @Roles(Role.DOCTOR)
  async getDoctorSlots(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto
  ) {
    return this.doctorService.getDoctorSlots(doctorId, query);
  }

  // 🔥 NEW: Get available slots for patients (public or patient role)
  @Get(':id/availability')
  @Public()
  async getAvailableSlotsForPatients(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto
  ) {
    return this.doctorService.getAvailableSlotsForPatients(doctorId, query);
  }

  // 🔥 ALTERNATIVE: Get available slots for patients (patient role only)
  @Get(':id/availability-protected')
  @Roles(Role.PATIENT)
  async getAvailableSlotsForPatientsProtected(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto
  ) {
    return this.doctorService.getAvailableSlotsForPatients(doctorId, query);
  }
}