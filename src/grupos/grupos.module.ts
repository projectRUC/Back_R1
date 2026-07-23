import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';

@Module({
  imports: [PrismaModule],
  controllers: [GruposController],
  providers: [GruposService],
  exports: [GruposService],
})
export class GruposModule {}
