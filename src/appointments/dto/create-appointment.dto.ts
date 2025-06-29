import {
  IsDateString,
  IsString,
  IsEnum,
  IsNumber,
  Matches,
  IsOptional
} from 'class-validator';

export class CreateAppointmentDto {
  @IsNumber()
  doctor_id: number;

  @IsDateString()
  date: string; // YYYY-MM-DD format

  @IsString()
  weekday: string;

  @IsEnum(['morning', 'evening'], { 
    message: 'Session must be morning or evening' 
  })
  session: 'morning' | 'evening';

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'Start time must be HH:MM format' 
  })
  start_time: string;

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { 
    message: 'End time must be HH:MM format' 
  })
  end_time: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}