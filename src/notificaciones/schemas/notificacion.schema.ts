import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Notificacion extends Document {
  @Prop({ required: true })
  usu_id: number; // Destinatario (alumno, maestro, scrum master, etc.)

  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  mensaje: string;

  @Prop({ required: true })
  tipo: string; // ej. 'SCRUM_BLOCKER', 'INFO', 'SISTEMA', 'NUEVO_PROYECTO'

  @Prop({ default: false })
  leida: boolean;

  @Prop()
  link?: string; // Enlace opcional en el frontend para redirigir

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata?: any; // JSON dinámico para referencias útiles adicionales
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);
