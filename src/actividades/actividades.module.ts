import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActividadesController } from './actividades.controller';
import { ActividadesService } from './actividades.service';
import { Proyecto, ProyectoSchema } from '../database/schemas/proyecto.schema';
import { Actividad, ActividadSchema } from '../database/schemas/actividad.schema';
import { PrismaModule } from '../database/prisma.module';
import { AlertasModule } from '../alertas/alertas.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proyecto.name, schema: ProyectoSchema },
      { name: Actividad.name, schema: ActividadSchema },
    ]),
    PrismaModule,
    AlertasModule,
    EmailModule,
  ],
  controllers: [ActividadesController],
  providers: [ActividadesService],
})
export class ActividadesModule {}
