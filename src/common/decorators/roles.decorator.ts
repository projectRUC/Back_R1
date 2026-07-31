import { SetMetadata } from '@nestjs/common';

/**
 * Clave de metadatos bajo la cual se almacenan los roles requeridos.
 * Se exporta para que RolesGuard pueda leerla con el mismo identificador.
 */
export const ROLES_KEY = 'roles';

/**
 * @Roles(...roles) — Decorador personalizado para RBAC.
 *
 * Uso en un controlador:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Docente', 'Scrum Master')
 * @Get('ruta-protegida')
 * getRutaProtegida() { ... }
 *
 * SetMetadata adjunta los roles al metadato del handler,
 * donde RolesGuard los leerá en tiempo de ejecución.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
