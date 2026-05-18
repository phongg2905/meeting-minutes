import { IsString, MinLength } from 'class-validator';

export class CreateSupportRequestDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(5)
  content: string;
}
