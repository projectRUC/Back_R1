import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HerramientasController } from './herramientas.controller';
import { HerramientasService } from './herramientas.service';
import { Proyecto, ProyectoSchema } from '../database/schemas/proyecto.schema';
import { Herramienta, HerramientaSchema } from '../database/schemas/herramienta.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Proyecto.name, schema: ProyectoSchema },
      { name: Herramienta.name, schema: HerramientaSchema },
    ]),
  ],
  controllers: [HerramientasController],
  providers: [HerramientasService],
  exports: [HerramientasService],
})
export class HerramientasModule {}
