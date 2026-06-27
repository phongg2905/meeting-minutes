import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(5)
  content: string;

  @IsOptional()
  @IsString()
  category?: string;
}
