import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alerta, TipoAlerta } from '../database/schemas/alerta.schema';

@Injectable()
export class AlertasService {
  constructor(@InjectModel(Alerta.name) private alertaModel: Model<Alerta>) {}

  /**
   * Crea una nueva alerta en el sistema.
   * Evita duplicar alertas del mismo tipo para la misma actividad si ya existe una alerta NO LEÍDA.
   */
  async crearAlerta(data: {
    scrum_master_id: number;
    actividad_id: Types.ObjectId;
    tipo: TipoAlerta;
    mensaje: string;
  }): Promise<Alerta | null> {
    // Validar si ya existe una alerta pendiente (no leída) del mismo tipo para esta actividad
    const alertaPendiente = await this.alertaModel.findOne({
      actividad_id: data.actividad_id,
      tipo: data.tipo,
      leida: false,
    });

    if (alertaPendiente) {
      // Ya existe una alerta de este tipo que no ha sido atendida, no generamos spam
      return null;
    }

    const nuevaAlerta = new this.alertaModel(data);
    return await nuevaAlerta.save();
  }

  /**
   * Obtiene todas las alertas (leídas y no leídas) de un Scrum Master.
   * Se devuelven ordenadas por fecha de creación descendente.
   */
  async getAlertasByScrumMaster(scrumMasterId: number): Promise<Alerta[]> {
    return await this.alertaModel
      .find({ scrum_master_id: scrumMasterId })
      .sort({ created_at: -1 })
      .exec();
  }

  /**
   * Marca una alerta como leída.
   * Valida que la alerta exista y que pertenezca al Scrum Master que la solicita.
   */
  async marcarLeida(id: string, scrumMasterId: number): Promise<Alerta> {
    const alerta = await this.alertaModel.findById(id);

    if (!alerta) {
      throw new NotFoundException('La alerta no existe');
    }

    if (alerta.scrum_master_id !== scrumMasterId) {
      throw new NotFoundException('No tienes permiso para marcar esta alerta como leída');
    }

    alerta.leida = true;
    return await alerta.save();
  }
}
