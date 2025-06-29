import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../types/roles.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccessTokenGuard } from '../auth/guard/access-token.guard';

@Controller('api/v1/patient')
@UseGuards(AccessTokenGuard, RolesGuard) // ✅ Apply guards to all routes
export class PatientController {

  @Get('profile')
  @Roles(Role.PATIENT) // ✅ Only patients can access
  getPatientProfile(@Req() req) {
    return { message: 'Welcome Patient', user: req.user };
  }

}
