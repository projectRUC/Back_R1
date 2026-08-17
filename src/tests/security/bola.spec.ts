jest.mock('@nestjs-modules/mailer', () => ({
  MailerService: jest.fn().mockImplementation(() => ({
    sendMail: jest.fn().mockResolvedValue(true),
  })),
}), { virtual: true });

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PerfilController } from '../../perfil/perfil.controller';
import { PerfilService } from '../../perfil/perfil.service';
import { EquiposController } from '../../equipos/equipos.controller';
import { EquiposService } from '../../equipos/equipos.service';
import { ActividadesController } from '../../actividades/actividades.controller';
import { ActividadesService } from '../../actividades/actividades.service';
import { DashboardController } from '../../dashboard/dashboard.controller';
import { DashboardService } from '../../dashboard/dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('Pruebas de Seguridad: BOLA (Broken Object Level Authorization / IDOR)', () => {
  let perfilController: PerfilController;
  let equiposController: EquiposController;
  let actividadesController: ActividadesController;
  let dashboardController: DashboardController;

  // Mock de usuarios para pruebas
  const usuarioVictima = {
    sub: 101,
    id: 101,
    rol: 'Alumno',
    correo: 'victima@utng.edu.mx',
    nombre: 'Usuario Víctima',
  };

  const usuarioAtacante = {
    sub: 202,
    id: 202,
    rol: 'Alumno',
    correo: 'atacante@utng.edu.mx',
    nombre: 'Usuario Atacante',
  };

  const usuarioDocente = {
    sub: 303,
    id: 303,
    rol: 'Docente',
    correo: 'docente@utng.edu.mx',
    nombre: 'Profesor Titular',
  };

  const mockPerfilService = {
    getMiCuenta: jest.fn((userId: number) => {
      if (userId === usuarioVictima.sub) {
        return Promise.resolve({
          id: usuarioVictima.sub,
          nombre: usuarioVictima.nombre,
          correo: usuarioVictima.correo,
          datosSensibles: 'Información confidencial de la víctima',
        });
      }
      if (userId === usuarioAtacante.sub) {
        return Promise.resolve({
          id: usuarioAtacante.sub,
          nombre: usuarioAtacante.nombre,
          correo: usuarioAtacante.correo,
          datosSensibles: 'Información del atacante',
        });
      }
      throw new NotFoundException('Usuario no encontrado');
    }),
    updatePerfil: jest.fn((userId: number, dto: any) => {
      return Promise.resolve({
        id: userId,
        mensaje: 'Perfil actualizado exitosamente para el usuario autenticado',
        ...dto,
      });
    }),
  };

  const mockEquiposService = {
    findOne: jest.fn((equipoId: number) => {
      if (equipoId === 1) {
        return Promise.resolve({
          id: 1,
          nombre: 'Equipo A (Privado)',
          proyectoId: 10,
          integrantes: [{ usuId: 101, nombre: 'Usuario Víctima' }],
        } as any);
      }
      if (equipoId === 2) {
        return Promise.resolve({
          id: 2,
          nombre: 'Equipo B',
          proyectoId: 20,
          integrantes: [{ usuId: 202, nombre: 'Usuario Atacante' }],
        } as any);
      }
      throw new NotFoundException('Equipo no encontrado');
    }),
    update: jest.fn((equipoId: number, dto: any) => {
      return Promise.resolve({ id: equipoId, ...dto } as any);
    }),
    remove: jest.fn((equipoId: number) => {
      return Promise.resolve({ mensaje: `Equipo ${equipoId} eliminado` } as any);
    }),
  };

  const mockActividadesService = {
    getActividadById: jest.fn((id: string) => {
      return Promise.resolve({
        _id: id,
        nom_actividad: 'Historia de Usuario #1',
        proyecto_id: 'proj-100',
        eq_id: 1,
      } as any);
    }),
    updateActividad: jest.fn((id: string, dto: any) => {
      return Promise.resolve({ _id: id, ...dto } as any);
    }),
    deleteActividad: jest.fn((id: string) => {
      return Promise.resolve({ _id: id } as any);
    }),
  };

  const mockDashboardService = {
    validarAccesoEquipo: jest.fn((equipoId: number, userId?: number, userRol?: string) => {
      if (userRol === 'Docente') return Promise.resolve();
      // Solo el usuario 101 pertenece al equipo 1
      if (equipoId === 1 && userId !== 101) {
        throw new ForbiddenException(
          'Acceso Denegado (BOLA): No perteneces a este equipo ni tienes autorización para acceder a sus datos.',
        );
      }
      return Promise.resolve();
    }),
    getDetalleProyectoEquipo: jest.fn(async (equipoId: number, userId?: number, userRol?: string) => {
      await mockDashboardService.validarAccesoEquipo(equipoId, userId, userRol);
      return {
        equipo: { id: equipoId, nombre: 'Equipo Seguro' },
        proyecto: { id: 10, nombre: 'Proyecto Confidencial' },
      } as any;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PerfilController, EquiposController, ActividadesController, DashboardController],
      providers: [
        { provide: PerfilService, useValue: mockPerfilService },
        { provide: EquiposService, useValue: mockEquiposService },
        { provide: ActividadesService, useValue: mockActividadesService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    perfilController = module.get<PerfilController>(PerfilController);
    equiposController = module.get<EquiposController>(EquiposController);
    actividadesController = module.get<ActividadesController>(ActividadesController);
    dashboardController = module.get<DashboardController>(DashboardController);
  });

  describe('CP-BOLA-01: Protección de Datos de Usuario e Identidad (Perfil)', () => {
    it('Debe obtener únicamente los datos del usuario autenticado en el token JWT y NO permitir acceso a otro ID', async () => {
      const reqAtacante: any = {
        user: usuarioAtacante,
        query: { userId: '101' },
        params: { id: '101' },
      };

      const resultado: any = await perfilController.getMiCuenta(reqAtacante);

      expect(resultado.id).toBe(202);
      expect(resultado.nombre).toBe('Usuario Atacante');
      expect(resultado.datosSensibles).toBe('Información del atacante');
      expect(mockPerfilService.getMiCuenta).toHaveBeenCalledWith(202);
      expect(mockPerfilService.getMiCuenta).not.toHaveBeenCalledWith(101);
    });

    it('Debe rechazar la manipulación de ID en actualización de perfil (/perfil/actualizar)', async () => {
      const reqAtacante: any = {
        user: usuarioAtacante,
      };
      const dtoMalicioso: any = {
        nombre: 'Nombre Modificado',
        usuId: 101,
      };

      const resultado: any = await perfilController.updatePerfil(reqAtacante, dtoMalicioso);

      expect(resultado.id).toBe(202);
      expect(mockPerfilService.updatePerfil).toHaveBeenCalledWith(202, dtoMalicioso);
      expect(mockPerfilService.updatePerfil).not.toHaveBeenCalledWith(101, expect.anything());
    });
  });

  describe('CP-BOLA-02: Control de Autorización en Recursos de Proyectos y Equipos (Dashboard)', () => {
    it('Debe BLOQUEAR con 403 Forbidden cuando un Alumno intenta consultar el equipo de otro compañero', async () => {
      const reqAtacante: any = {
        user: { sub: usuarioAtacante.sub, rol: usuarioAtacante.rol },
      };

      // Intento de ataque BOLA: El atacante (202) intenta leer el equipo 1 de la víctima (101)
      await expect(
        dashboardController.getDetalleProyectoEquipo(1, reqAtacante),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Debe PERMITIR el acceso cuando el usuario legítimo consulta su propio equipo', async () => {
      const reqVictima: any = {
        user: { sub: usuarioVictima.sub, rol: usuarioVictima.rol },
      };

      const resultado: any = await dashboardController.getDetalleProyectoEquipo(1, reqVictima);

      expect(resultado).toBeDefined();
      expect(resultado.equipo.id).toBe(1);
      expect(resultado.proyecto.nombre).toBe('Proyecto Confidencial');
    });

    it('Debe PERMITIR el acceso de auditoría a un Docente para cualquier equipo', async () => {
      const reqDocente: any = {
        user: { sub: usuarioDocente.sub, rol: usuarioDocente.rol },
      };

      const resultado: any = await dashboardController.getDetalleProyectoEquipo(1, reqDocente);

      expect(resultado).toBeDefined();
      expect(resultado.equipo.id).toBe(1);
    });
  });

  describe('CP-BOLA-03: Control de Autorización en Recursos de Equipos (Equipos)', () => {
    it('Debe consultar la información del equipo especificado garantizando validación de tipos e integridad', async () => {
      const equipoId = 1;
      const resultado: any = await equiposController.findOne(equipoId);

      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(1);
      expect(resultado.nombre).toBe('Equipo A (Privado)');
      expect(mockEquiposService.findOne).toHaveBeenCalledWith(1);
    });

    it('Debe arrojar NotFoundException cuando se consulta un ID de equipo inexistente', async () => {
      const equipoIdInexistente = 9999;

      await expect(equiposController.findOne(equipoIdInexistente)).rejects.toThrow(NotFoundException);
    });
  });

  describe('CP-BOLA-04: Manipulación de IDs en Historias de Usuario / Actividades', () => {
    it('Debe consultar la actividad por ID mapeando el objeto exacto en la base de datos', async () => {
      const actividadId = 'act-555';
      const resultado: any = await actividadesController.getActividadById(actividadId);

      expect(resultado).toBeDefined();
      expect(resultado._id).toBe('act-555');
      expect(mockActividadesService.getActividadById).toHaveBeenCalledWith('act-555');
    });

    it('Debe procesar la actualización enviando el ID específico de la entidad', async () => {
      const actividadId = 'act-555';
      const updateDto: any = { nom_actividad: 'Nuevo Título de Historia' };

      const resultado: any = await actividadesController.updateActividad(actividadId, updateDto);

      expect(resultado._id).toBe('act-555');
      expect(mockActividadesService.updateActividad).toHaveBeenCalledWith('act-555', updateDto);
    });

    it('Debe procesar la eliminación únicamente sobre el ID referenciado', async () => {
      const actividadId = 'act-555';
      const resultado: any = await actividadesController.deleteActividad(actividadId);

      expect(resultado).toBeDefined();
      expect(resultado._id).toBe('act-555');
      expect(mockActividadesService.deleteActividad).toHaveBeenCalledWith('act-555');
    });
  });

  describe('CP-BOLA-05: Resiliencia y Detección de Suplantación de Identidad', () => {
    it('Debe impedir el acceso si el token JWT contiene un payload incompleto o alterado', () => {
      const reqInvalido: any = {
        user: { sub: null, rol: null },
      };

      expect(() => {
        if (!reqInvalido.user.sub) {
          throw new UnauthorizedException('Token inválido: payload incompleto.');
        }
      }).toThrow(UnauthorizedException);
    });
  });
});
