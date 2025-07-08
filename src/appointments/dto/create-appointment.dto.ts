// ✅ CREATE-APPOINTMENT DTO
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  doctor_id: number;

  @IsInt()
  slot_id: number;

  @IsDateString()
  scheduled_on: string; // ISO date-time string

  @IsEnum(['morning', 'evening'])
  session: 'morning' | 'evening';

  @IsString()
  weekday: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}