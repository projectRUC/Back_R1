// src/auth/auth.regression.spec.ts
// Re-ejecutar estas pruebas después de cada cambio en AuthService
// para confirmar que el flujo de recuperación no rompió nada previo.

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

// Usuario base reutilizable en todos los casos
const usuarioBase = {
  usuId: 1,
  usuEmail: 'user@utng.edu.mx',
  usuPass: 'hashOriginal',
  usuNom: 'Juan',
  usuApp: 'Perez',
  usuApm: 'Lopez',
  estadoCuenta: 'ACTIVO',
  enRecuperacion: false,
  codigoRecuperacion: null,
  fechaCodigoRecuperacion: null,
  rolUsuario: { rolUsuNom: 'Alumno' },
};

describe('AuthService — Regresión: recuperación de credenciales', () => {
  let service: AuthService;
  let prismaMock: {
    usuario: { findUnique: jest.Mock; update: jest.Mock };
  };
  let jwtMock:   { sign: jest.Mock };
  let emailMock: { enviarCodigoRecuperacion: jest.Mock };

  beforeEach(async () => {
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash    as jest.Mock).mockReset();

    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        update:     jest.fn().mockResolvedValue({}),
      },
    };
    jwtMock    = { sign: jest.fn().mockReturnValue('fake.jwt.token') };
    emailMock  = { enviarCodigoRecuperacion: jest.fn().mockResolvedValue(undefined) };

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

  // ── CP-R-01 ───────────────────────────────────────────────────────────────
  // Verifica que login() sigue generando el token DESPUÉS de haber
  // incorporado solicitarRecuperacion / verificarCodigo / cambiarContrasena
  it('CP-R-01: login() sigue generando accessToken después de agregar el flujo de recuperación', async () => {
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioBase);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      correo: 'user@utng.edu.mx',
      password: 'Password123!',
    });

    // El token sigue llegando con el mismo shape que antes del cambio
    expect(result).toHaveProperty('accessToken', 'fake.jwt.token');

    // El payload del JWT sigue incluyendo sub y rol (RBAC intacto)
    expect(jwtMock.sign).toHaveBeenCalledWith({ sub: 1, rol: 'Alumno' });
  });

  // ── CP-R-02 ───────────────────────────────────────────────────────────────
  // Verifica que cambiarContrasenaRecuperacion() guarda el hash correctamente
  // Y que login() acepta la nueva contraseña sin romper el flujo anterior
  it('CP-R-02: cambiarContrasenaRecuperacion guarda el nuevo hash y login lo acepta', async () => {
    // --- Paso 1: cambiar contraseña vía recuperación ---
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioBase,
      enRecuperacion: true,   // prerequisito: ya pasó por solicitarRecuperacion
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('nuevoHash');

    await service.cambiarContrasenaRecuperacion('user@utng.edu.mx', 'NuevaPass123!');

    // Se hasheó con 10 rondas (BCRYPT_SALT_ROUNDS del servicio)
    expect(bcrypt.hash).toHaveBeenCalledWith('NuevaPass123!', 10);

    // Se persistió el hash y se apagó el flag enRecuperacion
    expect(prismaMock.usuario.update).toHaveBeenCalledWith({
      where: { usuId: 1 },
      data:  { usuPass: 'nuevoHash', enRecuperacion: false },
    });

    // --- Paso 2: login con la nueva contraseña debe seguir funcionando ---
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioBase,
      usuPass: 'nuevoHash',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      correo: 'user@utng.edu.mx',
      password: 'NuevaPass123!',
    });

    expect(result).toHaveProperty('accessToken');
  });

  // ── CP-R-03 ───────────────────────────────────────────────────────────────
  // Flujo completo encadenado con mocks:
  // solicitarRecuperacion → verificarCodigoRecuperacion
  //   → cambiarContrasenaRecuperacion → login con nueva contraseña
  it('CP-R-03: flujo completo solicitar → verificar → cambiar → login', async () => {
    const CODIGO      = '123456';
    const fechaReciente = new Date(Date.now() - 60_000); // hace 1 min, dentro de los 5 min de vigencia 12 

    // ── 1. solicitarRecuperacion ─────────────────────────────────────────
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioBase);

    await service.solicitarRecuperacion('user@utng.edu.mx');

    // Debe guardar el código y marcar enRecuperacion = true
    expect(prismaMock.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { usuId: 1 },
        data:  expect.objectContaining({ enRecuperacion: true }),
      }),
    );
    // Debe enviar el correo con el código
    expect(emailMock.enviarCodigoRecuperacion).toHaveBeenCalledWith(
      'user@utng.edu.mx', 'Juan', expect.any(String),
    );

    // ── 2. verificarCodigoRecuperacion ───────────────────────────────────
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioBase,
      codigoRecuperacion:      CODIGO,
      fechaCodigoRecuperacion: fechaReciente,
    });

    // Código correcto y vigente → no debe lanzar excepción
    await expect(
      service.verificarCodigoRecuperacion('user@utng.edu.mx', CODIGO),
    ).resolves.toBeUndefined();

    // ── 3. cambiarContrasenaRecuperacion ─────────────────────────────────
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioBase,
      enRecuperacion: true,
    });
    (bcrypt.hash as jest.Mock).mockResolvedValue('nuevoHash123');

    await service.cambiarContrasenaRecuperacion('user@utng.edu.mx', 'NuevaPass123!');

    // Última llamada a update debe guardar el hash y apagar la bandera
    expect(prismaMock.usuario.update).toHaveBeenLastCalledWith({
      where: { usuId: 1 },
      data:  { usuPass: 'nuevoHash123', enRecuperacion: false },
    });

    // ── 4. login con la nueva contraseña ─────────────────────────────────
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      ...usuarioBase,
      usuPass: 'nuevoHash123',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      correo: 'user@utng.edu.mx',
      password: 'NuevaPass123!',
    });

    expect(result).toEqual({ accessToken: 'fake.jwt.token' });
  });
});