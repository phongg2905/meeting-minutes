import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateParticipantDto {
  @IsString() full_name: string;
  @IsOptional() @IsString() role_in_meeting?: string;
  @IsOptional() @IsString() attendance_status?: string;
}

export class CreateTaskDto {
  @IsString() task_content: string;
  @IsOptional() @IsString() assigned_to?: string;
  @IsOptional() @IsString() deadline?: string;
  @IsOptional() @IsString() task_status?: string;
}

export class CreateMeetingMinuteDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(50) minute_code: string;
  @ApiProperty() @IsInt() type_id: number;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() class_name: string;
  @ApiProperty() @IsDateString() meeting_date: string;
  @ApiProperty() @IsString() start_time: string;
  @ApiProperty() @IsString() end_time: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() location?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() meeting_form?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() host_name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() secretary_name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() attendee_summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() absentee_summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() purpose?: string;
  @ApiProperty() @IsString() discussion_content: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() conclusion_content?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() followup_summary?: string;
  @ApiProperty({ required: false, default: 'draft' }) @IsOptional() @IsString() status?: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() is_public?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() review_note?: string;
  @ApiProperty({ required: false, type: [CreateParticipantDto] })
  @IsOptional() @IsArray() participants?: CreateParticipantDto[];
  @ApiProperty({ required: false, type: [CreateTaskDto] })
  @IsOptional() @IsArray() tasks?: CreateTaskDto[];
}
