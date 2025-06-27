import {
  IsDateString,
  IsEnum,
  IsString,
  Matches
} from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString()
  date: string;

  @IsString()
  weekday: string;

  @IsEnum(['morning', 'evening'], { message: 'Session must be morning or evening' })
  session: 'morning' | 'evening';

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Start time must be HH:MM' })
  start_time: string;

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'End time must be HH:MM' })
  end_time: string;
}
