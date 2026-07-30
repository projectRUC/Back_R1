import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { Notificacion, NotificacionSchema } from './schemas/notificacion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
