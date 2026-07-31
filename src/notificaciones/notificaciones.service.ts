import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notificacion } from './schemas/notificacion.schema';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectModel(Notificacion.name) private notificacionModel: Model<Notificacion>,
  ) {}

  async crearNotificacion(dto: CreateNotificacionDto) {
    const nuevaNotificacion = new this.notificacionModel(dto);
    return nuevaNotificacion.save();
  }

  async obtenerPorUsuario(usuId: number) {
    return this.notificacionModel.find({ usu_id: usuId }).sort({ createdAt: -1 }).exec();
  }

  async marcarComoLeida(notificacionId: string) {
    const notificacion = await this.notificacionModel.findByIdAndUpdate(
      notificacionId,
      { leida: true },
      { new: true }
    );
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notificacion;
  }

  async marcarTodasComoLeidas(usuId: number) {
    return this.notificacionModel.updateMany(
      { usu_id: usuId, leida: false },
      { $set: { leida: true } }
    ).exec();
  }

  async eliminarNotificacion(notificacionId: string) {
    return this.notificacionModel.findByIdAndDelete(notificacionId).exec();
  }
}
