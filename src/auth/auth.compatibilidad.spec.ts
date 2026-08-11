// src/auth/auth.compatibilidad.spec.ts
// CP-R-03: Verifica que la contraseña establecida por el flujo de recuperación
// permite iniciar sesión y que la contraseña anterior queda inválida.

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

describe('AuthService — CP-R-03: compatibilidad contraseña de recuperación', () => {
  let service: AuthService;
  let prismaMock: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtMock: { sign: jest.Mock };

  beforeEach(async () => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash    as jest.Mock).mockReset();

    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        update:     jest.fn().mockResolvedValue({}),
      },
    };
    jwtMock = { sign: jest.fn().mockReturnValue('fake.jwt.token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService,    useValue: jwtMock },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService,  useValue: { enviarCodigoRecuperacion: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('CP-R-03: la nueva contraseña permite login y la anterior queda inválida', async () => {
    // Mismos valores del CP-R-02c para consistencia entre casos
    const HASH_ANTERIOR  = 'hashAnterior';    // representa "Password123!"
    const HASH_NUEVO     = 'nuevoHashSeguro'; // representa "NuevaPass123!" (mismo que CP-R-02c)

    // ── Paso 1: cambiarContrasenaRecuperacion ────────────────────────────
    // La BD tiene el hash anterior y enRecuperacion activo
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       'user@utng.edu.mx',
      usuPass:        HASH_ANTERIOR,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: true,
      rolUsuario:     { rolUsuNom: 'Alumno' },
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue(HASH_NUEVO);

    await service.cambiarContrasenaRecuperacion('user@utng.edu.mx', 'NuevaPass123!');

    // Se guardó el hash nuevo y se apagó la bandera
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { usuId: 1 },
      data:  { usuPass: HASH_NUEVO, enRecuperacion: false },
    });

    // ── Paso 2: login con la NUEVA contraseña → debe generar token ───────
    // Ahora la BD tiene el hash nuevo (se actualizó en el paso anterior)
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       'user@utng.edu.mx',
      usuPass:        HASH_NUEVO,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: false,
      rolUsuario:     { rolUsuNom: 'Alumno' },
    });
    // bcrypt.compare("NuevaPass123!", HASH_NUEVO) → true
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const resultNueva = await service.login({
      correo:   'user@utng.edu.mx',
      password: 'NuevaPass123!',
    });

    // El login con la nueva contraseña retorna el token
    expect(resultNueva).toEqual({ accessToken: 'fake.jwt.token' });
    expect(jwtMock.sign).toHaveBeenCalledWith({ sub: 1, rol: 'Alumno' });

    // ── Paso 3: login con la ANTERIOR contraseña → debe fallar ───────────
    // La BD sigue teniendo el hash nuevo (la anterior ya no matchea)
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       'user@utng.edu.mx',
      usuPass:        HASH_NUEVO,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: false,
      rolUsuario:     { rolUsuNom: 'Alumno' },
    });
    // bcrypt.compare("Password123!", HASH_NUEVO) → false (hash ya no coincide)
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({ correo: 'user@utng.edu.mx', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});