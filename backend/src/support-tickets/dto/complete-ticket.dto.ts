import { IsString, MinLength } from 'class-validator';

export class CompleteTicketDto {
  @IsString()
  @MinLength(5)
  resolution: string;
}
