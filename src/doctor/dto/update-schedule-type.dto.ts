import { IsEnum } from 'class-validator';

export class UpdateScheduleTypeDto {
  @IsEnum(['stream', 'wave'], { 
    message: 'schedule_type must be either "stream" or "wave"' 
  })
  schedule_type: 'stream' | 'wave';
}