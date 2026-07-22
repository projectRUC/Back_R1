/**
 * ============================================================================
 * MÓDULO: Design Sprint (Registro de avances y evidencias)
 * ============================================================================
 * Este archivo define el CONTRATO PÚBLICO del módulo design-sprint.
 *
 * Úsalo para:
 *  - Tipar el body que debes enviar al registrar una fase.
 *  - Tipar la respuesta que recibes al consultar el avance de un equipo.
 *
 * Ubicación sugerida en el backend: src/design-sprint/interfaces/design-sprint.interface.ts
 * ============================================================================
 */

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

/**
 * Body para registrar el avance de una fase.
 * POST /design-sprint/evidencias
 *
 * IMPORTANTE sobre `proyectoId`:
 * No es un valor que se genera solo. Debe ser el `_id` de Mongo de un
 * proyecto QUE YA EXISTE en la colección `proyectos` (creado previamente
 * por el módulo de Proyectos). Si envías un valor que no existe o no tiene
 * el formato de ObjectId (24 caracteres hexadecimales), la API responde 400.
 */
export interface ICreateDesignSprintEvidenceInput {
  /** ID numérico del equipo que registra el avance */
  equipoId: number;

  /** _id de Mongo del proyecto al que pertenece este Design Sprint (debe existir previamente) */
  proyectoId: string;

  /** Fase que se está registrando */
  fase: FaseDesignSprint;

  /**
   * Evidencias multimedia codificadas en Base64.
   * Acepta tanto Base64 "puro" como Data URL completa
   * (ej: "data:image/png;base64,iVBORw0KG...").
   * Límites: máximo 5 evidencias por registro, 5MB cada una.
   */
  contenidoBase64?: string[];

  /** Comentarios u observaciones sobre la fase (máx. 1000 caracteres) */
  comentarios?: string;
}

/**
 * Objeto devuelto por POST /design-sprint/evidencias
 * y por GET .../fases/:fase (con el detalle completo de una fase).
 */
export interface IDesignSprintEvidence {
  /** ID único del registro, generado automáticamente por MongoDB */
  _id: string;

  equipoId: number;

  /** _id de Mongo del proyecto (referencia externa) */
  proyectoId: string;

  fase: FaseDesignSprint;

  /** Fecha y hora en que se registró el avance (ISO 8601) */
  fechaRegistro: string;

  contenidoBase64: string[];

  comentarios: string;

  /** Fecha de creación del documento (ISO 8601), generada automáticamente */
  created_at: string;
}

/**
 * Item individual dentro de la respuesta de consulta de avance.
 * Representa el estado de UNA fase para un equipo/proyecto.
 */
export interface IAvanceFase {
  fase: FaseDesignSprint;

  /** Día hábil correspondiente a la fase (ej: "Lunes") */
  dia: string;

  /** true si el equipo ya registró al menos un avance de esta fase */
  iniciado: boolean;

  /** Fecha del registro, o null si aún no se ha iniciado */
  fechaRegistro: string | null;

  /** Comentarios del registro, o null si aún no se ha iniciado */
  comentarios: string | null;
}

/**
 * Respuesta completa de GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId
 * Siempre devuelve un array de 4 elementos, en el orden:
 * Mapear -> Bocetar -> Decidir -> Prototipar,
 * sin importar si ya fueron registradas o no.
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
