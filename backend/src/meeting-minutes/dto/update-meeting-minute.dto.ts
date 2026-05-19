import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateParticipantDto, CreateTaskDto } from './create-meeting-minute.dto';

export class UpdateMeetingMinuteDto {
  @IsOptional() @IsString() @MaxLength(50) minute_code?: string;
  @IsOptional() @IsInt() type_id?: number;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() class_name?: string;
  @IsOptional() @IsDateString() meeting_date?: string;
  @IsOptional() @IsString() start_time?: string;
  @IsOptional() @IsString() end_time?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() meeting_form?: string;
  @IsOptional() @IsString() host_name?: string;
  @IsOptional() @IsString() secretary_name?: string;
  @IsOptional() @IsString() attendee_summary?: string;
  @IsOptional() @IsString() absentee_summary?: string;
  @IsOptional() @IsString() purpose?: string;
  @IsOptional() @IsString() discussion_content?: string;
  @IsOptional() @IsString() conclusion_content?: string;
  @IsOptional() @IsString() followup_summary?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsBoolean() is_public?: boolean;
  @IsOptional() @IsString() review_note?: string;
  @IsOptional() @IsArray() participants?: CreateParticipantDto[];
  @IsOptional() @IsArray() tasks?: CreateTaskDto[];
}
