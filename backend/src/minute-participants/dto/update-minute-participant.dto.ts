import { IsOptional, IsString } from 'class-validator';

export class UpdateMinuteParticipantDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  role_in_meeting?: string;

  @IsOptional()
  @IsString()
  attendance_status?: string;
}
