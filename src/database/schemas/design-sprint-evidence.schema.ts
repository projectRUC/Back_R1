import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Fases del Design Sprint, en orden estricto de ejecución.
 * Cada fase corresponde a un día hábil específico dentro
 * de los primeros 5 días del proyecto.
 */
export enum FaseDesignSprint {
  MAPEAR = 'mapear',
  BOCETAR = 'bocetar',
  DECIDIR = 'decidir',
  PROTOTIPAR = 'prototipar',
}

/** Orden secuencial de las fases (usado para validar que no se salten días) */
export const ORDEN_FASES: FaseDesignSprint[] = [
  FaseDesignSprint.MAPEAR,
  FaseDesignSprint.BOCETAR,
  FaseDesignSprint.DECIDIR,
  FaseDesignSprint.PROTOTIPAR,
];

/** Día hábil asignado a cada fase (para mensajes de error legibles) */
export const DIA_POR_FASE: Record<FaseDesignSprint, string> = {
  [FaseDesignSprint.MAPEAR]: 'Lunes',
  [FaseDesignSprint.BOCETAR]: 'Martes',
  [FaseDesignSprint.DECIDIR]: 'Miércoles',
  [FaseDesignSprint.PROTOTIPAR]: 'Jueves',
};

export type DesignSprintEvidenceDocument = DesignSprintEvidence & Document;

@Schema({
  collection: 'design_sprint_evidences',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class DesignSprintEvidence extends Document {
  /** ID del equipo que registra el avance */
  @Prop({ required: true, type: Number })
  equipoId: number;

  /** Proyecto al que pertenece este Design Sprint */
  @Prop({ type: Types.ObjectId, required: true })
  proyectoId: Types.ObjectId;

  /** Fase del Design Sprint que se está registrando */
  @Prop({ required: true, enum: FaseDesignSprint })
  fase: FaseDesignSprint;

  /** Fecha y hora en que se registró el avance de la fase */
  @Prop({ required: true, default: Date.now })
  fechaRegistro: Date;

  /** Evidencias multimedia (imágenes, bocetos) codificadas en Base64 */
  @Prop({ type: [String], default: [] })
  contenidoBase64: string[];

  /** Comentarios u observaciones del alumno/equipo sobre la fase */
  @Prop()
  comentarios: string;
}

export const DesignSprintEvidenceSchema =
  SchemaFactory.createForClass(DesignSprintEvidence);

// Un equipo no debería tener dos registros para la misma fase del mismo proyecto
DesignSprintEvidenceSchema.index(
  { equipoId: 1, proyectoId: 1, fase: 1 },
  { unique: true },
);