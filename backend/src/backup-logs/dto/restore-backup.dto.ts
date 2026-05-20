import { IsInt, IsString } from 'class-validator';

export class RestoreBackupDto {
  @IsInt()
  backup_id: number;

  @IsString()
  confirmation: string;
}
