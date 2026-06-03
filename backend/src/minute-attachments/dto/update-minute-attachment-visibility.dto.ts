import { IsBoolean } from 'class-validator';

export class UpdateMinuteAttachmentVisibilityDto {
  @IsBoolean()
  is_public_safe: boolean;
}
