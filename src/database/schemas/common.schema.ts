import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Comentario {
  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop({ required: true })
  comentario: string;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);
