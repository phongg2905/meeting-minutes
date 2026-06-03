import { Body, Controller, Delete, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BackupLogsService } from './backup-logs.service';
import { JwtAuthGuard, Roles, RolesGuard } from '../auth/jwt-auth.guard';
import { CreateBackupLogDto } from './dto/create-backup-log.dto';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@ApiTags('Backup Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1)
@Controller('backup-logs')
export class BackupLogsController {
  constructor(private service: BackupLogsService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Post()
  create(@Request() req, @Body() data: CreateBackupLogDto) {
    return this.service.create(req.user.user_id, data);
  }

  @Post('run')
  runBackup(@Request() req) {
    return this.service.runBackup(req.user.user_id);
  }

  @Post('restore')
  restore(@Request() req, @Body() dto: RestoreBackupDto) {
    return this.service.restore(req.user.user_id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.user_id, Number(id));
  }
}
