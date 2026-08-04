import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { AuditLogService } from '../../audit/audit-log.service';

/**
 * AuditLoggerInterceptor — Interceptor global de trazabilidad conforme a la LGPDPPSO.
 *
 * POLÍTICA ZERO PII:
 * - NO accede a req.body, req.query, ni contraseñas.
 * - Registra únicamente: método HTTP, ruta, módulo, ID del actor autenticado y fecha/hora.
 *
 * ASINCRONÍA Y RENDIMIENTO:
 * - Emplea RxJS .tap() para disparar la escritura en MongoDB en segundo plano
 *   sin bloquear ni retrasar la respuesta al cliente.
 */
@Injectable()
export class AuditLoggerInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<
      Request & { user?: { sub?: number; id?: number } }
    >();

    return next.handle().pipe(
      tap({
        next: () => {
          const metodoHttp = req.method;
          const ruta = req.originalUrl || req.url;
          const usuarioActorId = req.user?.sub ?? req.user?.id ?? null;

          // Extrae el módulo del primer segmento de la URL (ej: /perfil/mi-cuenta -> 'perfil')
          const cleanPath = (req.originalUrl || req.url || '').split('?')[0];
          const pathSegments = cleanPath.split('/').filter(Boolean);
          const modulo = pathSegments[0] || 'core';

          // Guardado asíncrono en segundo plano (fire-and-forget seguro)
          this.auditLogService
            .registrarLog({
              usuarioActorId,
              metodoHttp,
              ruta,
              modulo,
              fechaHora: new Date(),
            })
            .catch(() => {
              // Manejo silencioso en background
            });
        },
      }),
    );
  }
}
