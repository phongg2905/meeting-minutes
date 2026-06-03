import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MinuteAttachmentsService } from './minute-attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { UpdateMinuteAttachmentVisibilityDto } from './dto/update-minute-attachment-visibility.dto';

@ApiTags('Minute Attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('minute-attachments')
export class MinuteAttachmentsController {
  constructor(private service: MinuteAttachmentsService) {}

  @Get('minute/:minuteId')
  findByMinute(@Param('minuteId', ParseIntPipe) id: number, @Request() req) {
    return this.service.findByMinute(id, req.user.user_id, req.user.role_id);
  }

  @Post('minute/:minuteId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  create(
    @Param('minuteId', ParseIntPipe) id: number,
    @Request() req,
    @UploadedFile() file: any,
  ) {
    return this.service.create(id, req.user.user_id, req.user.role_id, file);
  }

  @Patch(':id/public-safe')
  updatePublicSafety(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: UpdateMinuteAttachmentVisibilityDto,
  ) {
    return this.service.updatePublicSafety(id, req.user.user_id, req.user.role_id, dto.is_public_safe);
  }

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Request() req, @Res() res: Response) {
    const { attachment, content } = await this.service.getDownload(id, req.user.user_id, req.user.role_id);
    const encodedName = encodeURIComponent(attachment.file_name).replace(/[!'()*]/g, (char) =>
      `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    res.setHeader('Content-Type', attachment.file_type || 'application/octet-stream');
    res.setHeader('Content-Length', content.length);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name.replace(/"/g, '')}"; filename*=UTF-8''${encodedName}`);
    return res.send(content);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user.user_id, req.user.role_id);
  }
}
