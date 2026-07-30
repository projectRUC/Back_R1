import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScrumService } from './scrum.service';
import { ScrumController } from './scrum.controller';
import { Daily, DailySchema } from '../database/schemas/daily.schema';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../database/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Daily.name, schema: DailySchema },
    ]),
    AiModule,
    PrismaModule,
    NotificacionesModule,
  ],
  controllers: [ScrumController],
  providers: [ScrumService],
  exports: [ScrumService],
})
export class ScrumModule {}
