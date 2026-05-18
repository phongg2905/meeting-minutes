import { IsOptional, IsString } from 'class-validator';

export class UpdateSupportRequestDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  response?: string;
}
