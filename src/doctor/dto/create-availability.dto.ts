import {
  IsDateString,
  IsEnum,
  IsString,
  Matches,
} from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString({}, { message: 'Date must be a valid ISO string' })
  date: string;

  @IsString({ message: 'Weekday must be a string' })
  weekday: string;

  @IsEnum(['morning', 'evening'], {
    message: 'Session must be either "morning" or "evening"',
  })
  session: 'morning' | 'evening';

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Consulting start time must be in HH:MM format',
  })
  consulting_start_time: string;

  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Consulting end time must be in HH:MM format',
  })
  consulting_end_time: string;

  @IsDateString({}, {
    message: 'Booking start time must be a valid ISO string',
  })
  booking_start_time: string;

  @IsDateString({}, {
    message: 'Booking end time must be a valid ISO string',
  })
  booking_end_time: string;
}
