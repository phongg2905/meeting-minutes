import { Module } from '@nestjs/common';
import { MinuteTypesService } from './minute-types.service';
import { MinuteTypesController } from './minute-types.controller';

@Module({ providers: [MinuteTypesService], controllers: [MinuteTypesController] })
export class MinuteTypesModule {}
