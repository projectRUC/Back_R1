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

/** Número de rondas de sal para bcrypt. Mayor valor = más seguro pero más lento.
 *  OWASP recomienda mínimo 10 rondas. */
const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  // ─────────────────────────────────────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Registra un nuevo usuario en el sistema.
   *
   * Seguridad:
   * - Verificamos duplicado de correo ANTES de hashear para no desperdiciar CPU.
   * - La contraseña se hashea con bcrypt (salt rounds=10) y NUNCA se persiste en
   *   texto plano, cumpliendo con estándares de protección de datos (OWASP).
   * - No retornamos el passwordHash en la respuesta.
   */
  async register(dto: RegisterDto) {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    // 1. Verificar que el correo no esté registrado ya
    const existingUser = await this.prisma.usuario.findUnique({
      where: { usuEmail: correoNormalizado },
    });
    if (existingUser) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    // 2. Verificar que el rolId exista en la tabla rol_usuario
    const rol = await this.prisma.rolUsuario.findUnique({
      where: { rolUsuId: dto.rolId },
    });
    if (!rol) {
      throw new ConflictException(
        `El rolId ${dto.rolId} no existe. Verifique los roles disponibles.`,
      );
    }

    // 3. Si se proporciona grupoId, verificar existencia del grupo
    if (dto.grupoId) {
      const grupo = await this.prisma.grupo.findUnique({
        where: { grupoId: dto.grupoId },
      });
      if (!grupo) {
        throw new ConflictException(`El grupoId ${dto.grupoId} no existe.`);
      }
    }

    // 4. Hashear la contraseña con bcrypt (protección de datos)
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // 5. Crear el usuario en la base de datos vía Prisma
    const newUser = await this.prisma.usuario.create({
      data: {
        usuNom: dto.nombre,
        usuApp: dto.apellidoPaterno,
        usuApm: dto.apellidoMaterno ?? null,
        usuEmail: correoNormalizado,
        usuPass: passwordHash, // Siempre se guarda el hash, nunca el texto plano
        rolId: dto.rolId,
        grupoId: dto.grupoId ?? null,
        estadoCuenta: 'ACTIVO',
        oposicionTratamiento: false,
      },
      // Incluir el rol y grupo para retornarlo en la respuesta
      include: { rolUsuario: true, grupo: true },
    });

    // 6. Retornar el usuario SIN el hash de contraseña
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

  /**
   * Autentica al usuario y emite un token JWT.
   *
   * Seguridad:
   * - Usamos bcrypt.compare() para comparar contra el hash almacenado,
   *   sin exponer jamás la contraseña en texto plano.
   * - El mensaje de error es GENÉRICO ("Credenciales inválidas") para no revelar
   *   si el correo existe o no (prevención de enumeración de usuarios).
   * - Verifica el estado de la cuenta (ACTIVO, INACTIVO, ANONIMIZADO).
   * - El payload del JWT incluye `sub` (ID) y `rol` para RBAC.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const correoNormalizado = dto.correo.trim().toLowerCase();

    // 1. Buscar al usuario por correo, incluyendo su rol
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: correoNormalizado },
      include: { rolUsuario: true },
    });

    // 2. Verificar existencia y contraseña con mensaje genérico (anti-enumeración)
    const isPasswordValid =
      usuario && (await bcrypt.compare(dto.password, usuario.usuPass));

    if (!isPasswordValid) {
      // Mensaje genérico: no revelar si el correo existe o no
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // 3. Verificar estado de la cuenta (Cumplimiento LGPDPPSO)
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

    // 4. Construir el payload del JWT con sub (ID) y rol obligatorios
    const payload = {
      sub: usuario.usuId, // subject estándar JWT = ID del usuario
      rol: usuario.rolUsuario.rolUsuNom, // Nombre del rol para RBAC
    };

    // 5. Firmar y retornar el token JWT
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  /**
   * Reactiva una cuenta inactiva previa validación de credenciales
   * y emite un nuevo token JWT.
   */
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

    // Reactivar en base de datos
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

  /**
   * Obtiene el perfil del usuario autenticado incluyendo nombre, correo y rol.
   * Optimiza el frontend eliminando la necesidad de consultas adicionales de usuario.
   */
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

  /**
   * Obtiene la lista pública de grupos escolares (id, nombre, descripción)
   * para que los alumnos puedan seleccionarlos por su nombre en el registro.
   */
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
}

