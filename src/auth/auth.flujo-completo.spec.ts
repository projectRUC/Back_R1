// src/auth/auth.flujo-completo.spec.ts
// CP-R-03: Flujo completo real — el código de recuperación se captura
// del mock del email igual que lo recibiría el usuario real en su bandeja.

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

describe('AuthService — CP-R-03: flujo completo de recuperación', () => {
  let service: AuthService;
  let prismaMock: { usuario: { findUnique: jest.Mock; update: jest.Mock } };
  let jwtMock:   { sign: jest.Mock };
  let emailMock: { enviarCodigoRecuperacion: jest.Mock };

  const CORREO       = 'user@utng.edu.mx';
  // Representan los hashes que bcrypt generaría para cada contraseña
  const HASH_ANTERIOR = '$2b$10$hashQueRepresentaPassword123';
  const HASH_NUEVO    = '$2b$10$hashQueRepresentaNuevaPass123';

  beforeEach(async () => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash    as jest.Mock).mockReset();

    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        update:     jest.fn().mockResolvedValue({}),
      },
    };
    jwtMock   = { sign: jest.fn().mockReturnValue('fake.jwt.token') };
    emailMock = { enviarCodigoRecuperacion: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService,    useValue: jwtMock },
        { provide: ConfigService, useValue: {} },
        { provide: EmailService,  useValue: emailMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('CP-R-03: flujo completo — nueva contraseña permite login y la anterior falla', async () => {

    // ══════════════════════════════════════════════════════════════════════
    // PASO 1 — solicitarRecuperacion
    // El servicio genera el código internamente (método privado).
    // Lo capturamos del tercer argumento del mock del email.
    // ══════════════════════════════════════════════════════════════════════
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       CORREO,
      usuNom:         'Juan',
      usuPass:        HASH_ANTERIOR,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: false,
      codigoRecuperacion:      null,
      fechaCodigoRecuperacion: null,
      rolUsuario: { rolUsuNom: 'Alumno' },
    });

    await service.solicitarRecuperacion(CORREO);

    // El código real que generó el servicio — mismo que recibiría el usuario
    // en su correo: enviarCodigoRecuperacion(email, nombre, CODIGO)
    const codigoReal: string = emailMock.enviarCodigoRecuperacion.mock.calls[0][2];

    // Validamos que sea un código de 6 dígitos (formato del servicio)
    expect(codigoReal).toMatch(/^\d{6}$/);

    // La BD recibió el código y se marcó enRecuperacion = true
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuId: 1 },
        data:  expect.objectContaining({
          codigoRecuperacion: codigoReal,
          enRecuperacion:     true,
        }),
      }),
    );

    // ══════════════════════════════════════════════════════════════════════
    // PASO 2 — verificarCodigoRecuperacion con el código capturado
    // ══════════════════════════════════════════════════════════════════════
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       CORREO,
      usuPass:        HASH_ANTERIOR,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: true,
      // Usamos el código real que capturamos del email
      codigoRecuperacion:      codigoReal,
      // Hace 1 minuto — dentro de la ventana de 5 minutos del servicio
      fechaCodigoRecuperacion: new Date(Date.now() - 60_000),
      rolUsuario: { rolUsuNom: 'Alumno' },
    });

    // Código correcto y vigente → no debe lanzar excepción
    await expect(
      service.verificarCodigoRecuperacion(CORREO, codigoReal),
    ).resolves.toBeUndefined();

    // El código se consumió: se pone a null para que no pueda reutilizarse
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { usuId: 1 },
      data:  { codigoRecuperacion: null, fechaCodigoRecuperacion: null },
    });

    // ══════════════════════════════════════════════════════════════════════
    // PASO 3 — cambiarContrasenaRecuperacion con "NuevaPass123!"
    // ══════════════════════════════════════════════════════════════════════
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:          1,
      usuEmail:       CORREO,
      usuPass:        HASH_ANTERIOR,
      estadoCuenta:   'ACTIVO',
      enRecuperacion: true,  // sigue activo hasta completar el cambio
      codigoRecuperacion:      null,
      fechaCodigoRecuperacion: null,
      rolUsuario: { rolUsuNom: 'Alumno' },
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue(HASH_NUEVO);

    await service.cambiarContrasenaRecuperacion(CORREO, 'NuevaPass123!');

    // Se hasheó "NuevaPass123!" con 10 rondas y se guardó en la BD
    expect(bcrypt.hash).toHaveBeenCalledWith('NuevaPass123!', 10);
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { usuId: 1 },
      data:  { usuPass: HASH_NUEVO, enRecuperacion: false },
    });

    // ══════════════════════════════════════════════════════════════════════
    // PASO 4a — login con "NuevaPass123!" → debe generar token ✓
    // ══════════════════════════════════════════════════════════════════════
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:        1,
      usuEmail:     CORREO,
      usuPass:      HASH_NUEVO,   // BD ya tiene el hash nuevo
      estadoCuenta: 'ACTIVO',
      rolUsuario:   { rolUsuNom: 'Alumno' },
    });
    // compare("NuevaPass123!", HASH_NUEVO) → true
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);

    const loginNueva = await service.login({ correo: CORREO, password: 'NuevaPass123!' });
    expect(loginNueva).toEqual({ accessToken: 'fake.jwt.token' });

    // ══════════════════════════════════════════════════════════════════════
    // PASO 4b — login cn "Password123!" → debe fallar ✗
    // ══════════════════════════════════════════════════════════════════════
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      usuId:        1,
      usuEmail:     CORREO,
      usuPass:      HASH_NUEVO,   // BD sigue con hash nuevo
      estadoCuenta: 'ACTIVO',
      rolUsuario:   { rolUsuNom: 'Alumno' },
    });
    // compare("Password123!", HASH_NUEVO) → false (hash ya no coincide)
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

    await expect(
      service.login({ correo: CORREO, password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});