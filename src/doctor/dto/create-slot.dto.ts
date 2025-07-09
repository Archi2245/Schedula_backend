// src/doctor/dto/create-slot.dto.ts
import {
  IsDateString,
  IsEnum,
  IsString,
  Matches,
  IsNumber,
  Min,
  Max,
  IsDate,
  IsOptional
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSlotDto {
  @IsDateString()
  date: string; // "2024-12-15"

  @IsString()
  weekday: string; // "Monday"

  @IsEnum(['morning', 'evening'], { message: 'Session must be morning or evening' })
  session: 'morning' | 'evening';

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Consulting start time must be HH:MM' })
  consulting_start_time: string; // "09:00"

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Consulting end time must be HH:MM' })
  consulting_end_time: string; // "10:00"

  @IsNumber()
  @Min(1, { message: 'Patients per slot must be at least 1' })
  @Max(10, { message: 'Patients per slot cannot exceed 10' })
  patients_per_slot: number; // 3

  @IsDateString()
  booking_start_time: string;

  @IsDateString()
  booking_end_time: string;

}