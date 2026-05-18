import { IsInt } from 'class-validator';

export class RestoreBackupDto {
  @IsInt()
  backup_id: number;
}
