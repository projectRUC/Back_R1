import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

/**
 * AuthController expone los endpoints de autenticación.
 *
 * Estrategia de sesión: Cookie HttpOnly
 * - El JWT se almacena en una cookie HttpOnly para protección XSS.
 * - El navegador la envía automáticamente en cada petición.
 * - sameSite: 'strict' protege contra ataques CSRF.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * GET /auth/grupos
   * Obtiene la lista pública de grupos escolares (id y nombre) para el formulario de registro de alumnos.
   */
  @Get('grupos')
  async getGrupos() {
    return this.authService.getGruposPublicos();
  }

  /**
   * POST /auth/register
   * Registra un nuevo usuario. No inicia sesión automáticamente.
   * - Body: { nombre, apellidoPaterno, apellidoMaterno?, correo, password, rolId, grupoId }
   * - Respuesta 201: datos del usuario creado (sin passwordHash)
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Autentica credenciales y establece el JWT en una cookie HttpOnly.
   *
   * Seguridad de la cookie:
   * - httpOnly: JS del navegador NO puede leerla (protege contra XSS)
   * - secure: solo se envía por HTTPS (en producción)
   * - sameSite: 'strict' previene que se envíe en requests de otros dominios (anti-CSRF)
   * - maxAge: duración de la cookie en milisegundos (8 horas)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(loginDto);

    // Establece el JWT en una cookie HttpOnly segura
    res.cookie('access_token', accessToken, {
      httpOnly: true, // JS del cliente no puede acceder
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'lax', // Permite envío entre puertos locales y navegación segura
      maxAge: 8 * 60 * 60 * 1000, // 8 horas en milisegundos
    });

    return { message: 'Sesión iniciada correctamente.' };
  }

  /**
   * POST /auth/reactivar
   * Reactiva una cuenta inactiva y establece el JWT en una cookie HttpOnly.
   */
  @Post('reactivar')
  @HttpCode(HttpStatus.OK)
  async reactivar(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.reactivar(loginDto);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
    });

    return { message: 'Cuenta reactivada y sesión iniciada correctamente.' };
  }

  /**
   * POST /auth/logout
   * Cierra la sesión limpiando la cookie del cliente.
   * No requiere body — solo necesita la cookie activa.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    // Sobrescribe la cookie con una vacía que expira inmediatamente
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    return { message: 'Sesión cerrada correctamente.' };
  }

  /**
   * POST /auth/me y GET /auth/me
   * Retorna los datos del usuario actualmente autenticado completos (perfil ligero).
   */
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async postMe(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getProfile(req.user.sub);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request & { user: JwtPayload }) {
    return this.authService.getProfile(req.user.sub);
  }
}
