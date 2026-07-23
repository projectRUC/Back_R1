import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { EquiposController } from './equipos.controller';
import { EquiposService } from './equipos.service';

/**
 * EquiposModule — Módulo de gestión para Equipos, Proyectos PAEC e Integrantes.
 *
 * Importa PrismaModule para el acceso a base de datos y provee
 * EquiposService a los controladores registrados.
 */
@Module({
  imports: [PrismaModule],
  controllers: [EquiposController],
  providers: [EquiposService],
  exports: [EquiposService],
})
export class EquiposModule {}
