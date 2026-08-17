// src/auth/auth.cambiar-contrasena.spec.ts
// CP-R-02: Verifica que cambiarContrasenaRecuperacion() conserva sus
// validaciones tras los cambios en AuthService (regresión).

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash:    jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';

const usuarioBase = {
  usuId: 1,
  usuEmail: 'user@utng.edu.mx',
  usuPass:  'hashAnterior',
  usuNom:   'Juan',
  usuApp:   'Perez',
  usuApm:   'Lopez',
  estadoCuenta:    'ACTIVO',
  enRecuperacion:  false,
  codigoRecuperacion:      null,
  fechaCodigoRecuperacion: null,
};

describe('AuthService — cambiarContrasenaRecuperacion() (regresión CP-R-02)', () => {
  let service: AuthService;
  let prismaMock: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash    as jest.Mock).mockReset();

    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        update:     jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService,    useValue: { sign: jest.fn() } },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService,  useValue: { enviarCodigoRecuperacion: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── CP-R-02: caso principal ───────────────────────────────────────────────
  // Si enRecuperacion === false el método debe rechazar el cambio.
  // Esto evita que alguien cambie la contraseña sin haber pasado
  // por solicitarRecuperacion + verificarCodigoRecuperacion primero.
  it('CP-R-02: lanza UnauthorizedException si no hay proceso de recuperación activo', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      ...usuarioBase,
      enRecuperacion: false,   // no se solicitó recuperación
    });

    await expect(
      service.cambiarContrasenaRecuperacion('user@utng.edu.mx', 'NuevaPass123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    // No debe guardarse nada en la BD
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  // ── CP-R-02b: usuario inexistente ─────────────────────────────────────────
  it('CP-R-02b: lanza UnauthorizedException si el usuario no existe', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);

    await expect(
      service.cambiarContrasenaRecuperacion('noexiste@utng.edu.mx', 'NuevaPass123!'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  // ── CP-R-02c: camino feliz ────────────────────────────────────────────────
  // Con enRecuperacion === true debe hashear la nueva contraseña,
  // guardarla y apagar la bandera enRecuperacion.
  it('CP-R-02c: guarda el nuevo hash y desactiva enRecuperacion cuando el flujo es válido', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      ...usuarioBase,
      enRecuperacion: true,   // ya pasó por solicitar + verificar código
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('nuevoHashSeguro');

    await service.cambiarContrasenaRecuperacion('user@utng.edu.mx', 'NuevaPass123!');

    // Se hasheó con las 10 rondas definidas en el servicio (BCRYPT_SALT_ROUNDS)
    expect(bcrypt.hash).toHaveBeenCalledWith('NuevaPass123!', 10);

    // Se persistió el hash nuevo y se desactivó la bandera
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { usuId: 1 },
      data:  { usuPass: 'nuevoHashSeguro', enRecuperacion: false },
    });
  });
});