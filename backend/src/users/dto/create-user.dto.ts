import { IsEmail, IsString, IsInt, IsOptional, IsIn, MinLength } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { VALID_ROLE_IDS } from '../../auth/roles.constants';
import { USER_STATUSES } from '../user.constants';

export class CreateUserDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @IsIn([...VALID_ROLE_IDS])
  role_id: number;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  full_name: string;

  @ApiProperty({ example: 'user@school.edu.vn' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password@123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, default: 'active' })
  @IsOptional()
  @IsString()
  @IsIn([...USER_STATUSES])
  status?: string;
}

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
  role_id?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  status?: string;
}
