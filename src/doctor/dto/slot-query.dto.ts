import { IsOptional, IsDateString, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class SlotQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(['morning', 'afternoon', 'evening'])
  session?: 'morning' | 'afternoon' | 'evening';

  @IsOptional()
  @IsEnum(['active', 'inactive', 'cancelled'])
  status?: 'active' | 'inactive' | 'cancelled';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value) || 1)
  page: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value) || 10)
  limit: number = 10;
}