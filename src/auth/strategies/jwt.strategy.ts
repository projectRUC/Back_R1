import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../database/prisma.service';

/** Forma del payload que viaja dentro del token JWT y se adjunta a req.user */
export interface JwtPayload {
  sub: number; // ID del usuario (subject estándar de JWT)
  id?: number; // Alias para req.user.id
  rol: string; // Nombre del rol (Alumno, Docente, Scrum Master)
  estadoCuenta?: string;
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
 * - Verifica contra la base de datos en tiempo real que la cuenta no esté anonimizada ni eliminada.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
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
   * Consulta el estado del usuario en la base de datos y se adjunta a req.user.
   */
  async validate(payload: JwtPayload): Promise<JwtPayload & { id: number; estadoCuenta: string }> {
    if (!payload.sub || !payload.rol) {
      throw new UnauthorizedException('Token inválido: payload incompleto.');
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId: payload.sub },
      include: { rolUsuario: true },
    });

    if (!usuario) {
      throw new UnauthorizedException('Usuario no encontrado en el sistema.');
    }

    if (usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new UnauthorizedException('Cuenta cancelada o no disponible.');
    }

    return {
      sub: usuario.usuId,
      id: usuario.usuId,
      rol: usuario.rolUsuario.rolUsuNom,
      estadoCuenta: usuario.estadoCuenta,
    };
  }
}

