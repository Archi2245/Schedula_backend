// src/doctor/dto/update-slot.dto.ts
import {
  IsOptional,
  Matches,
  IsNumber,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class UpdateSlotDto {
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:MM format',
  })
  start_time?: string;

  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:MM format',
  })
  end_time?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Patients per slot must be at least 1' })
  @Max(10, { message: 'Patients per slot cannot exceed 10' })
  patients_per_slot?: number;

@IsOptional()
@IsDateString({}, { message: 'Booking start time must be a valid ISO string' })
booking_start_time?: string;

@IsOptional()
@IsDateString({}, { message: 'Booking end time must be a valid ISO string' })
booking_end_time?: string;

}
