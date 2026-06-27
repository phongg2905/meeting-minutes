import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CompleteTicketDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung kết quả xử lý không được để trống' })
  @MaxLength(2000, {
    message: 'Nội dung kết quả xử lý không được vượt quá 2000 ký tự',
  })
  resolution: string;
}
