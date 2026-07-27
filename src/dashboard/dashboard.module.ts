import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../database/prisma.module';
import { Proyecto, ProyectoSchema } from '../database/schemas/proyecto.schema';
import { Actividad, ActividadSchema } from '../database/schemas/actividad.schema';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Proyecto.name, schema: ProyectoSchema },
      { name: Actividad.name, schema: ActividadSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
