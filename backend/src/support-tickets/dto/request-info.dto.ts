import { IsString, MinLength } from 'class-validator';

export class RequestInfoDto {
  @IsString()
  @MinLength(1)
  content: string;
}
