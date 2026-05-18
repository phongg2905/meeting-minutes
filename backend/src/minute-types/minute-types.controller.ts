import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MinuteTypesService } from './minute-types.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Minute Types')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('minute-types')
export class MinuteTypesController {
  constructor(private service: MinuteTypesService) {}
  @Get()
  findAll() { return this.service.findAll(); }
}
