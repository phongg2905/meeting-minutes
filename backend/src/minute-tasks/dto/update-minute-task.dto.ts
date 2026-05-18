import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateMinuteTaskDto {
  @IsOptional()
  @IsString()
  task_content?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsDateString()
  deadline?: string;

  @IsOptional()
  @IsString()
  task_status?: string;
}
