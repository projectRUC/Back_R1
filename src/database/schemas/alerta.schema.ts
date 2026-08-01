import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum TipoAlerta {
  VENCIMIENTO = 'Vencimiento',
  EVIDENCIA_FALTANTE = 'Evidencia Faltante',
}

@Schema({
  collection: 'alertas',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Alerta extends Document {
  @Prop({ required: true, type: Number })
  scrum_master_id: number; // ID del usuario Scrum Master en Postgres

  @Prop({ type: Types.ObjectId, required: true })
  actividad_id: Types.ObjectId; // ID de la actividad en MongoDB

  @Prop({ required: true, enum: TipoAlerta })
  tipo: TipoAlerta;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ default: false })
  leida: boolean;
}

export const AlertaSchema = SchemaFactory.createForClass(Alerta);
