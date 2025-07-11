import {
  IsArray,
  IsInt,
  IsOptional,
  ArrayNotEmpty,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';

export class RescheduleAppointmentsDto {
  @ValidateIf((o) => o.appointment_ids !== undefined) // Only validate if it's present
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @IsOptional()
  appointment_ids?: number[];

  @IsInt({ message: 'Shift minutes must be an integer' })
  @Min(10, { message: 'Minimum shift is 10 minutes' })
  @Max(180, { message: 'Maximum shift is 180 minutes (3 hours)' })
  shift_minutes: number;
}
