import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Comentario, ComentarioSchema } from './common.schema';

@Schema()
export class Parcial {
  @Prop({ type: Number, required: true })
  num_parcial: number;

  @Prop()
  fecha_inicio: Date;

  @Prop()
  fecha_fin: Date;

  @Prop()
  objetivo: string;

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const ParcialSchema = SchemaFactory.createForClass(Parcial);

@Schema()
export class Sprint {
  @Prop({ type: Number, required: true })
  num_sprint: number;

  @Prop()
  fecha_inicio: Date;

  @Prop()
  fecha_fin: Date;

  @Prop()
  objetivo: string;

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const SprintSchema = SchemaFactory.createForClass(Sprint);

@Schema({
  collection: 'proyectos',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class Proyecto extends Document {
  @Prop({ required: true })
  nombre: string;

  @Prop()
  descripcion: string;

  @Prop()
  fecha_inicio: Date;

  @Prop()
  fecha_fin: Date;

  @Prop({ type: [ParcialSchema], default: [] })
  parciales: Parcial[];

  @Prop({ type: [SprintSchema], default: [] })
  sprints: Sprint[];
}

export const ProyectoSchema = SchemaFactory.createForClass(Proyecto);
