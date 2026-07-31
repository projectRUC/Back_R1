import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class RespuestaDaily {
  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop({ required: true })
  por_hacer: string;

  @Prop({ required: true })
  hecho_ayer: string;

  @Prop()
  inconvenientes: string;
}
const RespuestaDailySchema = SchemaFactory.createForClass(RespuestaDaily);

@Schema({
  collection: 'dailies',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class Daily extends Document {
  @Prop({ required: true, type: Number })
  eq_id: number;

  @Prop({ type: Types.ObjectId, required: true })
  proyecto_id: Types.ObjectId;

  @Prop({ required: true, type: Number })
  sprint: number;

  @Prop({ required: true, type: Number })
  parcial: number;

  @Prop({ required: true })
  fecha_daily: Date;

  @Prop({ type: [RespuestaDailySchema], default: [] })
  respuestas: RespuestaDaily[];
}

export const DailySchema = SchemaFactory.createForClass(Daily);
