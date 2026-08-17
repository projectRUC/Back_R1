import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from 'src/email/email.service';

/** Número de rondas de sal para bcrypt. Mayor valor = más seguro pero más lento.
 *  OWASP recomienda mínimo 10 rondas. */
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,

  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    const existingUser = await this.prisma.usuario.findUnique({
      where: { usuEmail: correoNormalizado },
    });
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const rol = await this.prisma.rolUsuario.findUnique({
      where: { rolUsuId: dto.rolId },
    });
    if (!rol) {
      throw new ConflictException(
        `El rolId ${dto.rolId} no existe. Verifique los roles disponibles.`,
      );
    }

    if (dto.grupoId) {
      const grupo = await this.prisma.grupo.findUnique({
        where: { grupoId: dto.grupoId },
      });
      if (!grupo) {
        throw new ConflictException(`El grupoId ${dto.grupoId} no existe.`);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    const newUser = await this.prisma.usuario.create({
      data: {
        usuNom: dto.nombre,
        usuApp: dto.apellidoPaterno,
        usuApm: dto.apellidoMaterno ?? null,
        usuEmail: correoNormalizado,
        usuPass: passwordHash,
        rolId: dto.rolId,
        grupoId: dto.grupoId ?? null,
        estadoCuenta: 'ACTIVO',
        oposicionTratamiento: false,
      },
      include: { rolUsuario: true, grupo: true },
    });

    const nombreCompleto = [newUser.usuNom, newUser.usuApp, newUser.usuApm]
      .filter(Boolean)
      .join(' ');

    return {
      message: 'Usuario registrado exitosamente.',
      usuario: {
        id: newUser.usuId,
        nombre: nombreCompleto,
        correo: newUser.usuEmail,
        rol: newUser.rolUsuario.rolUsuNom,
        grupo: newUser.grupo ? newUser.grupo.grupoNom : null,
        grupoId: newUser.grupoId,
        estadoCuenta: newUser.estadoCuenta,
        oposicionTratamiento: newUser.oposicionTratamiento,
        createdAt: newUser.createdAt,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: correoNormalizado },
      include: { rolUsuario: true },
    });

    const isPasswordValid =
      usuario && (await bcrypt.compare(dto.password, usuario.usuPass));

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (usuario.estadoCuenta === 'INACTIVO') {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Tu cuenta se encuentra pausada/inactiva. Debes reactivarla para acceder.',
        error: 'ACCOUNT_PAUSED',
      });
    }

    if (usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new UnauthorizedException('Cuenta no disponible o anonimizada.');
    }

    const payload = {
      sub: usuario.usuId,
      rol: usuario.rolUsuario.rolUsuNom,
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async reactivar(dto: LoginDto): Promise<{ accessToken: string }> {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: correoNormalizado },
      include: { rolUsuario: true },
    });

    const isPasswordValid =
      usuario && (await bcrypt.compare(dto.password, usuario.usuPass));

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new UnauthorizedException('Cuenta cancelada o no disponible.');
    }

    await this.prisma.usuario.update({
      where: { usuId: usuario.usuId },
      data: { estadoCuenta: 'ACTIVO' },
    });

    const payload = {
      sub: usuario.usuId,
      rol: usuario.rolUsuario.rolUsuNom,
    };

    const accessToken = this.jwtService.sign(payload);
    return { accessToken };
  }

  async getProfile(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId: userId },
      include: {
        rolUsuario: true,
        grupo: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado en el sistema.');
    }

    const nombreCompleto = [
      usuario.usuNom,
      usuario.usuApp,
      usuario.usuApm,
    ]
      .filter(Boolean)
      .join(' ');

    return {
      id: usuario.usuId,
      nombre: nombreCompleto,
      usuNom: usuario.usuNom,
      usuApp: usuario.usuApp,
      usuApm: usuario.usuApm,
      correo: usuario.usuEmail,
      rol: usuario.rolUsuario.rolUsuNom,
      grupo: usuario.grupo ? usuario.grupo.grupoNom : null,
      grupoId: usuario.grupoId,
      estadoCuenta: usuario.estadoCuenta,
      oposicionTratamiento: usuario.oposicionTratamiento,
    };
  }

  async getGruposPublicos() {
    return this.prisma.grupo.findMany({
      select: {
        grupoId: true,
        grupoNom: true,
        grupoDesc: true,
      },
      orderBy: { grupoNom: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Solicitud de Recuperación de Password
  // ─────────────────────────────────────────────────────────────────────────────

  async solicitarRecuperacion(email: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: email },
    });

    // No revelamos si el correo existe o no (evita enumeración de usuarios)
    if (!usuario) {
      return;
    }

    const codigo = this.generarCodigoRecuperacion();

    // El código se guarda hasheado con bcrypt (mismo estándar que usuPass).
    // El correo se envía en texto plano al usuario (es el único lugar donde debe verse claro),
    // pero en la BD nunca queda almacenado en texto plano.
    const codigoHash = await bcrypt.hash(codigo, BCRYPT_SALT_ROUNDS);

    await this.prisma.usuario.update({
      where: { usuId: usuario.usuId },
      data: {
        codigoRecuperacion: codigoHash,
        fechaCodigoRecuperacion: new Date(),
        enRecuperacion: true,
      },
    });

    await this.emailService.enviarCodigoRecuperacion(usuario.usuEmail, usuario.usuNom, codigo);
  }

  private generarCodigoRecuperacion(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Verificación del Código de Recuperación
  // ─────────────────────────────────────────────────────────────────────────────

  private readonly CODIGO_RECUPERACION_VIGENCIA_MS = 5 * 60 * 1000; // 5 minutos

  async verificarCodigoRecuperacion(email: string, codigo: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: email },
    });

    // Mensaje genérico en todos los casos (correo no existe, sin código activo,
    // código incorrecto o expirado) para no dar pistas a un atacante.
    if (!usuario || !usuario.codigoRecuperacion || !usuario.fechaCodigoRecuperacion) {
      throw new UnauthorizedException('Código inválido o expirado.');
    }

    const codigoValido = await bcrypt.compare(codigo, usuario.codigoRecuperacion);
    if (!codigoValido) {
      throw new UnauthorizedException('Código inválido o expirado.');
    }

    const tiempoTranscurrido = Date.now() - usuario.fechaCodigoRecuperacion.getTime();
    if (tiempoTranscurrido > this.CODIGO_RECUPERACION_VIGENCIA_MS) {
      throw new UnauthorizedException('Código inválido o expirado.');
    }

    // Código válido: se consume para que no pueda reutilizarse.
    await this.prisma.usuario.update({
      where: { usuId: usuario.usuId },
      data: {
        codigoRecuperacion: null,
        fechaCodigoRecuperacion: null,
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Cambio de Contraseña (paso final de recuperación)
  // ─────────────────────────────────────────────────────────────────────────────

  async cambiarContrasenaRecuperacion(email: string, nuevaPassword: string): Promise<void> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: email },
    });

    if (!usuario || !usuario.enRecuperacion) {
      throw new UnauthorizedException('No hay un proceso de recuperación activo para este correo.');
    }

    const passwordHash = await bcrypt.hash(nuevaPassword, BCRYPT_SALT_ROUNDS);

    await this.prisma.usuario.update({
      where: { usuId: usuario.usuId },
      data: {
        usuPass: passwordHash,
        enRecuperacion: false,
      },
    });
  }
}