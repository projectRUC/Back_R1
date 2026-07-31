import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProyectosController } from './proyectos.controller';
import { ProyectosService } from './proyectos.service';
import { Proyecto, ProyectoSchema } from '../database/schemas/proyecto.schema';
import { Actividad, ActividadSchema } from '../database/schemas/actividad.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proyecto.name, schema: ProyectoSchema },
      { name: Actividad.name, schema: ActividadSchema },
    ]),
  ],
  controllers: [ProyectosController],
  providers: [ProyectosService],
})
export class ProyectosModule {}
