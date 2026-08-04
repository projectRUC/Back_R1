import {
  ExecutionContext,
  ForbiddenException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ALLOW_INACTIVE_KEY } from '../decorators/allow-inactive.decorator';

/**
 * JwtAuthGuard extiende el guardia de Passport con la estrategia 'jwt'.
 *
 * Cumplimiento LGPDPPSO:
 * - Valida la firma y vigencia del JWT.
 * - Rechaza automáticamente peticiones si el usuario en la BD no está ACTIVO,
 *   lanzando ForbiddenException (403) con código 'ACCOUNT_PAUSED'.
 * - Permite el paso a cuentas inactivas únicamente si el handler está decorado con @AllowInactive()
 *   (utilizado para el endpoint PATCH /perfil/reactivar).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('No autorizado: sesión no válida o expirada.');
    }

    const allowInactive = this.reflector.getAllAndOverride<boolean>(
      ALLOW_INACTIVE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (user.estadoCuenta === 'INACTIVO' && !allowInactive) {
      throw new ForbiddenException({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Tu cuenta se encuentra pausada/inactiva. Debes reactivarla para acceder.',
        error: 'ACCOUNT_PAUSED',
      });
    }

    return user;
  }
}

