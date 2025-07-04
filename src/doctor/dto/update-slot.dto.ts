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

export class UpdateSlotDto {
  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Consulting start time must be HH:MM' })
  consulting_start_time?: string;

  @IsOptional()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Consulting end time must be HH:MM' })
  consulting_end_time?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Patients per slot must be at least 1' })
  @Max(10, { message: 'Patients per slot cannot exceed 10' })
  patients_per_slot?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  booking_start_time?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  booking_end_time?: Date;
}