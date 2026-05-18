import { Controller, Delete, Get, Param, ParseIntPipe, Post, Request, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { MinuteAttachmentsService } from './minute-attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';

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

  @Get(':id/download')
  async download(@Param('id', ParseIntPipe) id: number, @Request() req, @Res() res: Response) {
    const attachment = await this.service.getDownload(id, req.user.user_id, req.user.role_id);
    return res.download(attachment.file_path, attachment.file_name);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.remove(id, req.user.user_id, req.user.role_id);
  }
}
