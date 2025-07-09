// src/doctor/dto/create-slot.dto.ts
import {
  IsDateString,
  IsEnum,
  IsString,
  Matches,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateSlotDto {
  @IsDateString()
  date: string; // e.g., "2024-12-15"

  @IsString()
  weekday: string; // e.g., "Monday"

  @IsEnum(['morning', 'afternoon', 'evening'], {
    message: 'Session must be morning, afternoon, or evening',
  })
  session: 'morning' | 'afternoon' | 'evening';

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format',
  })
  start_time: string; // "09:00"

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format',
  })
  end_time: string; // "10:00"

  @IsNumber()
  @Min(1, { message: 'Patients per slot must be at least 1' })
  @Max(10, { message: 'Patients per slot cannot exceed 10' })
  patients_per_slot: number;

  @IsDateString()
  booking_start_time: string; // ISO string

  @IsDateString()
  booking_end_time: string; // ISO string
}
