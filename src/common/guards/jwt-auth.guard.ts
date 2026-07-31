import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard extiende el guardia de Passport con la estrategia 'jwt'.
 * Al aplicar este guardia en una ruta, Passport extrae y valida el Bearer token
 * automáticamente antes de que la petición llegue al handler.
 *
 * Si el token es inválido o está ausente, Passport lanza automáticamente
 * un 401 UnauthorizedException.
 *
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * @Get('perfil')
 * getPerfil(@Request() req) { return req.user; }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
