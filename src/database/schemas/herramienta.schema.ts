import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { EstatusHerramienta } from 'src/common/providers/enums/estatus-herramienta.enum';

@Schema({
  collection: 'herramientas',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Herramienta extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Proyecto', required: true })
  proyecto_id: Types.ObjectId;

  @Prop({ required: true })
  nombre_herra: string;

  @Prop({ required: true })
  descripcion: string;

  @Prop({ required: true })
  uso: string;

  @Prop()
  url_herramienta: string;

  @Prop({
    type: String,
    enum: EstatusHerramienta,
    default: EstatusHerramienta.PENDIENTE,
  })
  estatus: EstatusHerramienta;

  @Prop()
  evaluacion_o_motivo: string;
}

export const HerramientaSchema = SchemaFactory.createForClass(Herramienta);
