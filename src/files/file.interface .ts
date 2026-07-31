/**
 * ============================================================================
 * MÓDULO: Files (Gestor de Archivos)
 * ============================================================================
 * Este archivo define el CONTRATO PÚBLICO del módulo de archivos.
 *
 * Úsalo para:
 *  - Tipar las respuestas que recibes del backend en tu frontend (React, etc).
 *  - Tipar el body que debes enviar en cada request.
 *  - Saber exactamente qué campos existen, cuáles son opcionales y sus tipos.
 *
 * Ubicación sugerida en el backend: src/files/interfaces/file.interface.ts
 * ============================================================================
 */

/**
 * Representa un archivo tal como se almacena y se devuelve desde la API.
 * Este es el objeto que recibirás en las respuestas de:
 *  - POST /files/upload
 *  - GET /files
 *  - GET /files/:id
 */
export interface IFile {
  /** ID único generado por MongoDB (usar este valor para descargar/eliminar) */
  _id: string;

  /** Nombre original del archivo tal como lo subió el usuario (ej: "foto.png") */
  originalName: string;

  /** Nombre físico guardado en el servidor, ya renombrado para evitar colisiones */
  fileName: string;

  /**
   * Ruta física en el servidor (uso interno backend).
   * NO usar directamente desde el frontend para mostrar/descargar el archivo.
   */
  path: string;

  /**
   * Ruta pública relativa para acceder al archivo.
   * Debe concatenarse con la URL base del backend.
   * Ejemplo de uso en frontend:
   *   const imageSrc = `${API_BASE_URL}${file.url}`;
   */
  url: string;

  /** Tipo MIME del archivo (ej: "image/png", "application/pdf") */
  mimeType: string;

  /** Tamaño del archivo en bytes */
  size: number;

  /** Extensión del archivo, incluyendo el punto (ej: ".png", ".pdf") */
  extension: string;

  /** Categoría opcional para agrupar archivos (ej: "avatars", "documentos") */
  category: string;

  /** ID del usuario que subió el archivo, si se envió en el upload. Null si no aplica */
  uploadedBy: string | null;

  /** Fecha de creación del registro (ISO 8601), generada automáticamente */
  createdAt: string;

  /** Fecha de última actualización del registro (ISO 8601), generada automáticamente */
  updatedAt: string;
}

/**
 * Body que se debe enviar (como parte de un FormData, junto al archivo)
 * al hacer POST /files/upload.
 *
 * IMPORTANTE: el archivo en sí se envía en el campo "file" del FormData,
 * no como JSON. Estos campos van como campos adicionales del mismo FormData.
 *
 * Ejemplo:
 *   const formData = new FormData();
 *   formData.append("file", fileBlob);
 *   formData.append("category", "avatars");
 *   formData.append("uploadedBy", "66f0a1b2c3d4e5f6a7b8c9d0");
 */
export interface ICreateFileInput {
  /** Categoría opcional para clasificar el archivo. Default: "general" */
  category?: string;

  /** ID del usuario que sube el archivo (opcional, útil si integras con auth) */
  uploadedBy?: string;
}

/**
 * Respuesta del endpoint DELETE /files/:id
 */
export interface IDeleteFileResponse {
  message: string;
}

/**
 * Estructura estándar de error que devuelve la API cuando algo falla.
 * NestJS devuelve este shape por defecto en sus excepciones HTTP.
 */
export interface IApiErrorResponse {
  /** Mensaje descriptivo del error */
  message: string;

  /** Nombre corto del error HTTP (ej: "Not Found", "Bad Request") */
  error: string;

  /** Código de estado HTTP (ej: 404, 400, 500) */
  statusCode: number;
}
