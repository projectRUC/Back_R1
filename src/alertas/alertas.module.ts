import { Module } from '@nestjs/common';
import { AlertasController } from './alertas.controller';
import { AlertasService } from './alertas.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Alerta, AlertaSchema } from '../database/schemas/alerta.schema';
import { PrismaModule } from '../database/prisma.module';
import { Actividad, ActividadSchema } from '../database/schemas/actividad.schema';
import { AlertasCronService } from './alertas-cron.service';

@Module({
  imports: [
    PrismaModule,
    MongooseModule.forFeature([
      { name: Alerta.name, schema: AlertaSchema },
      { name: Actividad.name, schema: ActividadSchema },
    ]),
  ],
  controllers: [AlertasController],
  providers: [AlertasService, AlertasCronService],
  exports: [AlertasService],
})
export class AlertasModule {}
