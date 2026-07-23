import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Comentario, ComentarioSchema } from './common.schema';

@Schema()
export class Mapeo {
  @Prop()
  proyecto_problema: string;

  @Prop()
  proyecto_objective: string;

  @Prop()
  enfoque: string;

  @Prop({ type: [String], default: [] })
  archivos: string[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const MapeoSchema = SchemaFactory.createForClass(Mapeo);

@Schema()
export class Puntuacion {
  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop({ required: true, type: Number })
  valor: number;

  @Prop({ type: ComentarioSchema })
  comentario: Comentario;
}
const PuntuacionSchema = SchemaFactory.createForClass(Puntuacion);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Boceto {
  @Prop()
  propuesta: string;

  @Prop({ required: true, type: Number })
  usu_id: number;

  @Prop()
  status: string;

  @Prop({ type: [String], default: [] })
  archivos: string[];

  @Prop({ type: [PuntuacionSchema], default: [] })
  puntuaciones: Puntuacion[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const BocetoSchema = SchemaFactory.createForClass(Boceto);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Prototipo {
  @Prop()
  nombre_prototipo: string;

  @Prop()
  descripcion: string;

  @Prop({ type: [String], default: [] })
  archivos: string[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const PrototipoSchema = SchemaFactory.createForClass(Prototipo);

@Schema({ timestamps: { createdAt: 'created_at', updatedAt: false } })
export class Entrevista {
  @Prop()
  descripcion: string;

  @Prop({ type: [String], default: [] })
  archivos: string[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios: Comentario[];
}
const EntrevistaSchema = SchemaFactory.createForClass(Entrevista);

@Schema({
  collection: 'sprint_designs',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class SprintDesign extends Document {
  @Prop({ required: true, type: Number })
  eq_id: number;

  @Prop({ type: Types.ObjectId, required: true })
  proyecto_id: Types.ObjectId;

  @Prop()
  status: string;

  @Prop({ type: MapeoSchema })
  mapeo: Mapeo;

  @Prop({ type: [BocetoSchema], default: [] })
  bocetos: Boceto[];

  @Prop({ type: PrototipoSchema })
  prototipo: Prototipo;

  @Prop({ type: [EntrevistaSchema], default: [] })
  entrevistas: Entrevista[];

  @Prop({ type: [ComentarioSchema], default: [] })
  comentarios_generales: Comentario[];
}

export const SprintDesignSchema = SchemaFactory.createForClass(SprintDesign);
