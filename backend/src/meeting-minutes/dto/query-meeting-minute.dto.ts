import { IsOptional, IsString } from 'class-validator';

export class QueryMeetingMinuteDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() is_public?: string;
  @IsOptional() @IsString() type_id?: string;
  @IsOptional() @IsString() class_name?: string;
  @IsOptional() @IsString() host_name?: string;
  @IsOptional() @IsString() secretary_name?: string;
  @IsOptional() @IsString() meeting_form?: string;
  @IsOptional() @IsString() date_from?: string;
  @IsOptional() @IsString() date_to?: string;
  @IsOptional() @IsString() mine?: string;
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() limit?: string;
}
