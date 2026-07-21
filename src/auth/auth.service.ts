import {
  ConflictException,
  Injectable,
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
  ) {}

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
    // 1. Verificar que el correo no esté registrado ya
    const existingUser = await this.prisma.usuario.findUnique({
      where: { usuEmail: dto.correo },
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

    // 3. Hashear la contraseña con bcrypt (protección de datos)
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // 4. Crear el usuario en la base de datos vía Prisma
    const newUser = await this.prisma.usuario.create({
      data: {
        usuNom: dto.nombre,
        usuApp: dto.apellidoPaterno,
        usuApm: dto.apellidoMaterno ?? null,
        usuEmail: dto.correo,
        usuPass: passwordHash, // Siempre se guarda el hash, nunca el texto plano
        rolId: dto.rolId,
      },
      // Incluir el rol para retornarlo en la respuesta
      include: { rolUsuario: true },
    });

    // 5. Retornar el usuario SIN el hash de contraseña
    return {
      message: 'Usuario registrado exitosamente.',
      usuario: {
        id: newUser.usuId,
        nombre: `${newUser.usuNom} ${newUser.usuApp}`,
        correo: newUser.usuEmail,
        rol: newUser.rolUsuario.rolUsuNom,
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
   * - El payload del JWT incluye `sub` (ID) y `rol` para RBAC.
   */
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    // 1. Buscar al usuario por correo, incluyendo su rol
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuEmail: dto.correo },
      include: { rolUsuario: true },
    });

    // 2. Verificar existencia y contraseña con mensaje genérico (anti-enumeración)
    const isPasswordValid =
      usuario && (await bcrypt.compare(dto.password, usuario.usuPass));

    if (!isPasswordValid) {
      // Mensaje genérico: no revelar si el correo existe o no
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // 3. Construir el payload del JWT con sub (ID) y rol obligatorios
    const payload = {
      sub: usuario.usuId,          // subject estándar JWT = ID del usuario
      rol: usuario.rolUsuario.rolUsuNom, // Nombre del rol para RBAC
    };

    // 4. Firmar y retornar el token JWT
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
