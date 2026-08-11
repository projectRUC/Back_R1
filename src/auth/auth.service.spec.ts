// jest.mock se eleva (hoist) antes de los imports por ts-jest,
// así bcrypt ya llega mockeado cuando AuthService lo importa.
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash:    jest.fn(),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';          // ahora es el mock, no el real
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';

const usuarioActivo = {
  usuId: 1,
  usuEmail: 'user@utng.edu.mx',
  usuPass:  'hashGuardado',
  usuNom:   'Juan',
  usuApp:   'Perez',
  usuApm:   'Lopez',
  estadoCuenta: 'ACTIVO',
  rolUsuario: { rolUsuNom: 'Alumno' },
};

describe('AuthService — login()', () => {
  let service: AuthService;
  let prismaMock: { usuario: { findUnique: jest.Mock } };
  let jwtMock:   { sign: jest.Mock };

  beforeEach(async () => {
    // Limpiar los mocks entre tests
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash    as jest.Mock).mockReset();

    prismaMock = { usuario: { findUnique: jest.fn() } };
    jwtMock    = { sign: jest.fn().mockReturnValue('fake.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService,    useValue: jwtMock },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService,  useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── CP-U-03 ──────────────────────────────────────────────────────────────
  it('CP-U-03: login lanza UnauthorizedException con contraseña incorrecta', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioActivo);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ correo: 'user@utng.edu.mx', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtMock.sign).not.toHaveBeenCalled();
  });

  // ── CP-U-03b ─────────────────────────────────────────────────────────────
  it('CP-U-03b: login lanza UnauthorizedException si el correo no existe', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(null);
    // usuario es null → isPasswordValid = false sin llegar a bcrypt

    await expect(
      service.login({ correo: 'noexiste@utng.edu.mx', password: 'cualquiera' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(jwtMock.sign).not.toHaveBeenCalled();
  });

  // ── CP-U-03c ─────────────────────────────────────────────────────────────
  it('CP-U-03c: login lanza ForbiddenException si la cuenta está INACTIVA', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue({
      ...usuarioActivo,
      estadoCuenta: 'INACTIVO',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({ correo: 'user@utng.edu.mx', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(jwtMock.sign).not.toHaveBeenCalled();
  });

  // ── CP-U-03d ─────────────────────────────────────────────────────────────
  it('CP-U-03d: login retorna accessToken con credenciales correctas', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioActivo);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      correo: 'user@utng.edu.mx',
      password: 'Password123!',
    });

    expect(result).toEqual({ accessToken: 'fake.jwt.token' });
    expect(jwtMock.sign).toHaveBeenCalledWith({ sub: 1, rol: 'Alumno' });
  });
});