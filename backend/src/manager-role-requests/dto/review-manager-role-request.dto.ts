import { IsOptional, IsString } from 'class-validator';

export class ReviewManagerRoleRequestDto {
  @IsString()
  status: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  response?: string;
}
