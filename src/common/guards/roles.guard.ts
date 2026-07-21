import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../../auth/strategies/jwt.strategy';

/**
 * RolesGuard — Guardia de Autorización Basada en Roles (RBAC).
 *
 * FLUJO DE AUTORIZACIÓN:
 * 1. Lee los roles requeridos del decorador @Roles() usando Reflector.
 * 2. Si no hay roles requeridos en la ruta, permite el acceso (ruta pública protegida solo por JWT).
 * 3. Extrae el usuario autenticado de req.user (inyectado por JwtAuthGuard/JwtStrategy).
 * 4. Compara el rol del usuario contra los roles permitidos.
 * 5. Lanza ForbiddenException (403) si el usuario no tiene el rol requerido.
 *
 * IMPORTANTE: Debe usarse SIEMPRE junto con JwtAuthGuard para que req.user esté disponible:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Obtener los roles requeridos del decorador @Roles()
    // getAllAndOverride busca primero en el handler, luego en la clase
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. Si no hay roles definidos, la ruta no requiere rol específico → permitir
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Obtener el usuario desde req.user (poblado por JwtStrategy.validate())
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    // 4. Verificar que el usuario tenga un rol en su payload
    if (!user || !user.rol) {
      throw new ForbiddenException(
        'Acceso denegado: no se pudo determinar el rol del usuario.',
      );
    }

    // 5. Verificar si el rol del usuario está entre los roles permitidos
    const hasRole = requiredRoles.includes(user.rol);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado: se requiere uno de los siguientes roles: [${requiredRoles.join(', ')}]. Tu rol actual es: ${user.rol}.`,
      );
    }

    return true;
  }
}
