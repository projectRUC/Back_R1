import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Comentario, ComentarioSchema } from './common.schema';

@Schema()
export class Asignado {
  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop({ required: true })
  usu_nom: string;
}
const AsignadoSchema = SchemaFactory.createForClass(Asignado);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Evidencia {
  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ type: [String], default: [] })
  archivos: string[];
}
const EvidenciaSchema = SchemaFactory.createForClass(Evidencia);

@Schema({ collection: 'actividades', timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Actividad extends Document {
  @Prop({ required: true, type: Number })
  eq_id: number;

  @Prop({ type: Types.ObjectId, required: true })
  proyecto_id: Types.ObjectId;

  @Prop({ required: true })
  nom_actividad: string;

  @Prop()
  descripcion: string;

  @Prop({ type: [String], default: [] })
  criterios_aceptacion: string[];

  @Prop({ type: [AsignadoSchema], default: [] })
  asignados: Asignado[];

  @Prop()
  fecha_inicio: Date;

  @Prop()
  fecha_fin: Date;

  @Prop({ type: Number })
  estimacion: number;

  @Prop({ type: Number })
  sprint: number;

  @Prop()
  prioridad: string;

  @Prop({ type: Number })
  parcial: number;

  @Prop({ type: [String], default: [] })
  archivos: string[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];

  @Prop({ type: [EvidenciaSchema], default: [] })
  evidencias: Evidencia[];
}

export const ActividadSchema = SchemaFactory.createForClass(Actividad);
