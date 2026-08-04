export interface CreateAuditLogDto {
  usuarioActorId?: number | null;
  metodoHttp: string;
  ruta: string;
  modulo: string;
  fechaHora?: Date;
}
