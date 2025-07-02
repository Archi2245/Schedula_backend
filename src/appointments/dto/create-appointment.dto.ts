import {
  IsDateString,
  IsString,
  IsEnum,
  IsNumber,
  IsISO8601,
  IsOptional
} from 'class-validator';

export class CreateAppointmentDto {
  @IsNumber()
  doctor_id: number;

  @IsISO8601()
  scheduled_on: string; // Full ISO datetime: "2025-07-15T09:00:00.000Z"

  @IsString()
  weekday: string;

  @IsEnum(['morning', 'evening'], { 
    message: 'Session must be morning or evening' 
  })
  session: 'morning' | 'evening';

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}