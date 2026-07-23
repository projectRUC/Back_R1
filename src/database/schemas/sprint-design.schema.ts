import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ============================================================================
// ENUM Y CONSTANTES
// ============================================================================

export enum FaseDesignSprint {
  MAPEAR = 'mapear',
  BOCETAR = 'bocetar',
  DECIDIR = 'decidir',
  PROTOTIPAR = 'prototipar',
}

export const ORDEN_FASES: FaseDesignSprint[] = [
  FaseDesignSprint.MAPEAR,
  FaseDesignSprint.BOCETAR,
  FaseDesignSprint.DECIDIR,
  FaseDesignSprint.PROTOTIPAR,
];

export const DIA_POR_FASE: Record<FaseDesignSprint, string> = {
  [FaseDesignSprint.MAPEAR]: 'Lunes',
  [FaseDesignSprint.BOCETAR]: 'Martes',
  [FaseDesignSprint.DECIDIR]: 'Miércoles',
  [FaseDesignSprint.PROTOTIPAR]: 'Jueves',
};

// ============================================================================
// SCHEMA DE MONGOOSE (esto es lo que se guarda realmente en MongoDB)
// ============================================================================

export type DesignSprintEvidenceDocument = DesignSprintEvidence & Document;

@Schema({
  collection: 'design_sprint_evidences',
  timestamps: { createdAt: 'created_at', updatedAt: false },
})
export class DesignSprintEvidence {
  @Prop({ required: true, type: Number })
  equipoId: number;

  @Prop({ type: Types.ObjectId, required: true })
  proyectoId: Types.ObjectId;

  @Prop({ required: true, enum: FaseDesignSprint })
  fase: FaseDesignSprint;

  @Prop({ required: true, default: Date.now })
  fechaRegistro: Date;

  // URLs de los archivos subidos mediante el módulo Files
  @Prop({ type: [String], default: [] })
  archivosUrls: string[];

  @Prop({ default: '' })
  comentarios: string;
}

export const DesignSprintEvidenceSchema =
  SchemaFactory.createForClass(DesignSprintEvidence);

// Un equipo no debería tener dos registros para la misma fase del mismo proyecto
DesignSprintEvidenceSchema.index(
  { equipoId: 1, proyectoId: 1, fase: 1 },
  { unique: true },
);

// ============================================================================
// INTERFACES DE TIPADO (para contratos de entrada/salida de la API)
// ============================================================================

export interface ICreateDesignSprintEvidenceInput {
  equipoId: number;
  proyectoId: string;
  fase: FaseDesignSprint;
  archivosUrls?: string[];
  comentarios?: string;
}

export interface IDesignSprintEvidence {
  _id: string;
  equipoId: number;
  proyectoId: string;
  fase: FaseDesignSprint;
  fechaRegistro: string;
  archivosUrls: string[];
  comentarios: string;
  created_at: string;
}

export interface IAvanceFase {
  fase: FaseDesignSprint;
  dia: string;
  iniciado: boolean;
  fechaRegistro: string | null;
  comentarios: string | null;
  cantidadArchivos: number;
}

export type IAvanceDesignSprint = IAvanceFase[];

export interface IApiErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}