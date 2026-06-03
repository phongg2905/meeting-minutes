import { IsString, IsInt, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VALID_ROLE_IDS } from '../../auth/roles.constants';
import { USER_STATUSES } from '../user.constants';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @IsIn([...VALID_ROLE_IDS])
  role_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @IsIn([...USER_STATUSES])
  status?: string;
}
