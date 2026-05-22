import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MinuteTypesService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.minuteType.findMany({ orderBy: { type_id: 'asc' } });
  }
}
