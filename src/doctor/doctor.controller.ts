import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Req,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DoctorService } from './doctor.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotDto } from './dto/update-slot.dto';
import { SlotQueryDto } from './dto/slot-query.dto';
import { UpdateScheduleTypeDto } from './dto/update-schedule-type.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('doctor')
@UseGuards(AccessTokenGuard, RolesGuard)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  // ✅ Doctor welcome route
  @Get('profile')
  @Roles(Role.DOCTOR)
  getDoctorProfile(@Req() req) {
    return {
      message: 'Welcome Doctor',
      user: req.user,
    };
  }

  // ✅ Public - Get all doctors (search optional)
  @Get()
  @Public()
  getAllDoctors(@Query('search') search?: string) {
    return this.doctorService.findAll(search);
  }

  // ✅ Public - Get doctor by ID
  @Get(':id')
  @Public()
  getDoctorById(@Param('id', ParseIntPipe) doctorId: number) {
    return this.doctorService.findOne(doctorId);
  }

  // ✅ Update schedule type (Doctor only)
  @Patch(':id/schedule-type')
  @Roles(Role.DOCTOR)
  updateScheduleType(
    @Param('id', ParseIntPipe) doctorId: number,
    @Body() dto: UpdateScheduleTypeDto,
    @Req() req,
  ) {
    return this.doctorService.updateScheduleType(doctorId, dto, req.user.sub);
  }


  // ✅ Update Slot (Doctor only)
  @Put(':id/slots/:slotId')
  @Roles(Role.DOCTOR)
  updateSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Body() dto: UpdateSlotDto,
    @Req() req,
  ) {
    return this.doctorService.updateSlot(doctorId, slotId, dto, req.user.sub);
  }

  // ✅ Delete Slot (Doctor only)
  @Delete(':id/slots/:slotId')
  @Roles(Role.DOCTOR)
  deleteSlot(
    @Param('id', ParseIntPipe) doctorId: number,
    @Param('slotId', ParseIntPipe) slotId: number,
    @Req() req,
  ) {
    return this.doctorService.deleteSlot(doctorId, slotId, req.user.sub);
  }

  // ✅ Get Doctor’s Own Slots (Paginated)
  @Get(':id/slots')
  @Roles(Role.DOCTOR)
  getDoctorSlots(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto,
  ) {
    return this.doctorService.getDoctorSlots(doctorId, query);
  }

  // ✅ Get Available Slots For Patients (Public route)
  @Get(':id/availability')
  @Public()
  getAvailableSlotsForPatients(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto,
  ) {
    return this.doctorService.getAvailableSlotsForPatients(doctorId, query);
  }

  // ✅ Alternate: Get Patient-Protected Availability
  @Get(':id/availability-protected')
  @Roles(Role.PATIENT)
  getAvailableSlotsForPatientsProtected(
    @Param('id', ParseIntPipe) doctorId: number,
    @Query() query: SlotQueryDto,
  ) {
    return this.doctorService.getAvailableSlotsForPatients(doctorId, query);
  }

   // ✅ Create Availability (Doctor only)
@Post(':id/availability')
@Roles(Role.DOCTOR)
createAvailability(
  @Param('id', ParseIntPipe) doctorId: number,
  @Body() dto: CreateAvailabilityDto,
  @Req() req,
) {
  return this.doctorService.createAvailability(doctorId, dto, req.user.sub);
}

// ✅ Create Slot under Availability
@Post(':id/availability/:availabilityId/slots')
@Roles(Role.DOCTOR)
createSlotUnderAvailability(
  @Param('id', ParseIntPipe) doctorId: number,
  @Param('availabilityId', ParseIntPipe) availabilityId: number,
  @Body() dto: CreateSlotDto,
  @Req() req,
) {
  return this.doctorService.createSlot(doctorId, availabilityId, dto, req.user.sub);
}

}
