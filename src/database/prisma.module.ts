import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global() hace que PrismaService esté disponible en toda la aplicación
 * sin necesidad de importar PrismaModule en cada módulo que lo necesite.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
