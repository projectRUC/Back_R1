import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

/** Forma del payload que viaja dentro del token JWT */
export interface JwtPayload {
  sub: number; // ID del usuario (subject estándar de JWT)
  rol: string; // Nombre del rol (Alumno, Docente, Scrum Master)
  iat?: number; // Issued at (generado automáticamente)
  exp?: number; // Expiration (generado automáticamente)
}

/**
 * JwtStrategy valida el token en cada petición protegida.
 *
 * Estrategia: Cookie HttpOnly llamada "access_token"
 * - El navegador envía la cookie automáticamente en cada request.
 * - HttpOnly impide que JavaScript del cliente acceda a ella (anti-XSS).
 * - El extractor personalizado lee req.cookies.access_token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Extractor personalizado: lee el JWT desde la cookie "access_token"
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // Lee la cookie HttpOnly enviada automáticamente por el navegador
          return request?.cookies?.access_token ?? null;
        },
      ]),
      // Rechaza tokens expirados automáticamente
      ignoreExpiration: false,
      // Secreto para verificar la firma del token
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Se ejecuta DESPUÉS de que Passport verifica la firma del token.
   * Solo llega aquí si el token es válido y no ha expirado.
   * El objeto retornado se adjunta a req.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.rol) {
      throw new UnauthorizedException('Token inválido: payload incompleto.');
    }
    return { sub: payload.sub, rol: payload.rol };
  }
}
