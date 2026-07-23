// src/design-sprint/design-sprint.interface.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ============================================================================
// ENUM Y CONSTANTES
// ============================================================================

/**
 * Fases del Design Sprint, en el orden estricto en que deben registrarse.
 * No se puede registrar una fase sin que la anterior ya se haya iniciado.
 */
export enum FaseDesignSprint {
  MAPEAR = 'mapear', // Lunes
  BOCETAR = 'bocetar', // Martes
  DECIDIR = 'decidir', // Miércoles
  PROTOTIPAR = 'prototipar', // Jueves
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

// ============================================================================
// SCHEMA DE MONGOOSE (lo que realmente se guarda en MongoDB)
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
// INTERFACES DE TIPADO (contrato público de entrada/salida de la API)
// ============================================================================

/**
 * Body para registrar el avance de una fase.
 * POST /design-sprint/evidencias
 *
 * IMPORTANTE sobre `proyectoId`:
 * Debe ser el `_id` de Mongo de un proyecto QUE YA EXISTE en la colección
 * `proyectos`. Si envías un valor que no existe o no tiene formato de
 * ObjectId (24 caracteres hexadecimales), la API responde 400.
 */
export interface ICreateDesignSprintEvidenceInput {
  /** ID numérico del equipo que registra el avance */
  equipoId: number;

  /** _id de Mongo del proyecto al que pertenece este Design Sprint */
  proyectoId: string;

  /** Fase que se está registrando */
  fase: FaseDesignSprint;

  /**
   * URLs de los archivos ya subidos previamente vía POST /files/upload.
   * Máximo 5 por registro.
   */
  archivosUrls?: string[];

  /** Comentarios u observaciones sobre la fase (máx. 1000 caracteres) */
  comentarios?: string;
}

/**
 * Objeto devuelto por POST /design-sprint/evidencias
 * y por GET .../fases/:fase (con el detalle completo de una fase).
 */
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

/**
 * Item individual dentro de la respuesta de consulta de avance.
 * Representa el estado de UNA fase para un equipo/proyecto.
 */
export interface IAvanceFase {
  fase: FaseDesignSprint;
  dia: string;
  iniciado: boolean;
  fechaRegistro: string | null;
  comentarios: string | null;
  cantidadArchivos: number;
}

/**
 * Respuesta completa de GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId
 * Siempre devuelve un array de 4 elementos, en el orden:
 * Mapear -> Bocetar -> Decidir -> Prototipar.
 */
export type IAvanceDesignSprint = IAvanceFase[];

/**
 * Estructura estándar de error que devuelve la API cuando algo falla.
 */
export interface IApiErrorResponse {
  message: string;
  error: string;
  statusCode: number;
}