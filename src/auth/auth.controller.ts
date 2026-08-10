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
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JwtPayload } from './strategies/jwt.strategy';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SolicitarRecuperacionDto } from './dto/solicitar-recuperacion.dto';
import { VerificarCodigoDto } from './dto/verificar-codigo.dto';
import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto';

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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
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
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken } = await this.authService.login(loginDto);

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
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
   * POST /auth/recuperacion
   * Inicia la recuperación de contraseña: genera un código de 6 dígitos,
   * lo guarda junto con su fecha de creación y lo envía por correo.
   *
   * Seguridad:
   * - Throttle más estricto que login/register para evitar spam de correos.
   * - Respuesta genérica: no revela si el correo está registrado o no
   *   (anti-enumeración de usuarios).
   */
  @Throttle({ auth: { limit: 3, ttl: 60000 } })
  @Post('recuperacion')
  @HttpCode(HttpStatus.OK)
  async solicitarRecuperacion(@Body() dto: SolicitarRecuperacionDto) {
    await this.authService.solicitarRecuperacion(dto.correo);
    return {
      message: 'Si el correo está registrado, recibirás un código de recuperación.',
    };
  }

  /**
   * POST /auth/logout
   * Cierra la sesión limpiando la cookie del cliente.
   * No requiere body — solo necesita la cookie activa.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
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


  /**
   * POST /auth/verificar-codigo
   * Valida el código de 6 dígitos enviado al correo del usuario y su vigencia
   * de 5 minutos. Si es correcto, lo consume (lo deja en null junto con su
   * fecha) para que no pueda reutilizarse.
   *
   * Seguridad:
   * - Throttle estricto: un código de 6 dígitos es fuerza-bruteable si no se
   *   limitan los intentos.
   * - Mensaje genérico de error (ver AuthService) para no revelar la causa
   *   exacta del fallo.
   */
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('verificar-codigo')
  @HttpCode(HttpStatus.OK)
  async verificarCodigo(@Body() dto: VerificarCodigoDto) {
    await this.authService.verificarCodigoRecuperacion(dto.correo, dto.codigo);
    return { message: 'Código verificado correctamente.' };
  }

  /**
   * POST /auth/cambiar-contrasena
   * Último paso de la recuperación: define la nueva contraseña.
   * Solo funciona si el usuario tiene un proceso de recuperación activo
   * (enRecuperacion === true), validado previamente por verificar-codigo.
   */
  @Throttle({ auth: { limit: 5, ttl: 60000 } })
  @Post('cambiar-contrasena')
  @HttpCode(HttpStatus.OK)
  async cambiarContrasena(@Body() dto: CambiarContrasenaDto) {
    await this.authService.cambiarContrasenaRecuperacion(dto.correo, dto.nuevaPassword);
    return { message: 'Contraseña actualizada correctamente.' };
  }


}