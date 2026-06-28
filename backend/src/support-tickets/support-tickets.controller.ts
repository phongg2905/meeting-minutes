import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SupportTicketsService } from './support-tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { RequestInfoDto } from './dto/request-info.dto';
import { CompleteTicketDto } from './dto/complete-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';

@ApiTags('Support Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private service: SupportTicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách ticket — User: ticket của mình, Admin: tất cả' })
  findAll(@Request() req, @Query() query: QueryTicketDto) {
    return this.service.findAll(req.user.user_id, req.user.role_id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết ticket kèm messages và attachments' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.service.findOne(id, req.user.user_id, req.user.role_id);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo ticket mới (User)' })
  create(@Request() req, @Body() dto: CreateTicketDto) {
    return this.service.create(req.user.user_id, dto);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Gửi message vào ticket (User: WAITING_FOR_USER, Admin: PROCESSING)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 5, { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  addMessage(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: AddMessageDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.addMessage(id, req.user.user_id, req.user.role_id, dto, files);
  }

  @Patch(':id/request-info')
  @ApiOperation({ summary: '[Admin] Yêu cầu bổ sung thông tin → WAITING_FOR_USER' })
  requestMoreInfo(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: RequestInfoDto,
  ) {
    return this.service.requestMoreInfo(id, req.user.user_id, req.user.role_id, dto);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: '[Admin] Hoàn thành ticket → COMPLETED' })
  complete(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Body() dto: CompleteTicketDto,
  ) {
    return this.service.complete(id, req.user.user_id, req.user.role_id, dto);
  }

  @Get('attachments/:id/download')
  @ApiOperation({ summary: 'Tải tệp đính kèm của ticket' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const { attachment, content } = await this.service.getDownloadAttachment(
      id,
      req.user.user_id,
      req.user.role_id,
    );
    const encodedName = encodeURIComponent(attachment.file_name).replace(
      /[!'()*]/g,
      (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
    res.setHeader(
      'Content-Type',
      attachment.file_type || 'application/octet-stream',
    );
    res.setHeader('Content-Length', content.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${attachment.file_name.replace(
        /"/g,
        '',
      )}"; filename*=UTF-8''${encodedName}`,
    );
    return res.send(content);
  }
}
