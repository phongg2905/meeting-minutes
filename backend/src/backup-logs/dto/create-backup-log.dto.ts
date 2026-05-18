import { IsOptional, IsString } from 'class-validator';

export class CreateBackupLogDto {
  @IsString()
  action_type: string;

  @IsOptional()
  @IsString()
  file_name?: string;

  @IsOptional()
  @IsString()
  file_path?: string;
}
