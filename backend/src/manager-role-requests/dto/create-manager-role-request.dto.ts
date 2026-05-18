import { IsOptional, IsString } from 'class-validator';

export class CreateManagerRoleRequestDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
