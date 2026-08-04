import { SetMetadata } from '@nestjs/common';

export const ALLOW_INACTIVE_KEY = 'allowInactive';

/**
 * Decorador para permitir el acceso a rutas protegidas por JWT a usuarios
 * cuyo estado de cuenta sea INACTIVO (por ejemplo: la ruta de reactivación).
 */
export const AllowInactive = () => SetMetadata(ALLOW_INACTIVE_KEY, true);
