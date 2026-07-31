import { Document, Types } from 'mongoose';

// ============================================================================
// ENUM Y CONSTANTES
// ============================================================================

export enum FaseDesignSprint {
  MAPEAR = 'MAPEAR',
  BOCETAR = 'BOCETAR',
  DECIDIR = 'DECIDIR',
  PROTOTIPAR = 'PROTOTIPAR',
  FINALIZADO = 'FINALIZADO',
}

export enum StatusBoceto {
  PENDIENTE = 'PENDIENTE',
  GANADOR = 'GANADOR',
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
  [FaseDesignSprint.FINALIZADO]: 'Finalizado',
};

// ============================================================================
// INTERFACES DE TIPADO
// ============================================================================

export interface IComentario {
  usu_id: number;
  texto: string;
  comentario?: string;
  fecha?: Date;
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