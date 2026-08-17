import { Test, TestingModule } from '@nestjs/testing';
import { AlumnosService } from './alumnos.service';
import { PrismaService } from '../database/prisma.service';
import { GetAlumnosFilterDto } from './dto/get-alumnos-filter.dto';

// Helper: crea un alumno "falso" con la forma exacta que espera el mapeo de findAll().
// OJO: rolUsuario es OBLIGATORIO porque el código lee alu.rolUsuario.rolUsuNom
// SIN optional chaining -> si falta, la prueba truena con "Cannot read properties of undefined".
const makeAlumno = (i: number) => ({
  usuId: i,
  usuNom: `Alumno${i}`,
  usuApp: 'Perez',
  usuApm: 'Lopez',
  rolUsuario: { rolUsuNom: 'Alumno' },
  grupo: { grupoNom: 'GIDS6093-E' },
  equiposAlumno: [
    {
      equipo: { eqNom: 'Equipo A', proyecto: { proyectoNom: 'PAEC' } },
      rolEquipo: { rolEqNom: 'Developer' },
    },
  ],
  equiposScrumMaster: [],
});

describe('AlumnosService', () => {
  let service: AlumnosService;
  let prismaMock: {
    usuario: { count: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    // Mock de Prisma: solo simulamos los métodos que usa findAll()
    prismaMock = {
      usuario: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlumnosService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<AlumnosService>(AlumnosService);
  });

  it('CP-U-01: findAll devuelve la lista paginada con sus metadatos', async () => {
    const alumnos = Array.from({ length: 10 }, (_, i) => makeAlumno(i + 1));
    // count y findMany corren en Promise.all -> hay que mockear los DOS
    prismaMock.usuario.count.mockResolvedValue(25);
    prismaMock.usuario.findMany.mockResolvedValue(alumnos);

    const filters: GetAlumnosFilterDto = { page: 1, limit: 10 };
    const result = await service.findAll(filters);

    // 1) La página trae 10 elementos
    expect(result.data).toHaveLength(10);

    // 2) Los metadatos se calculan bien (25 / 10 => 3 páginas)
    expect(result.meta).toEqual({
      totalItems: 25,
      itemCount: 10,
      itemsPerPage: 10,
      totalPages: 3,
      currentPage: 1,
    });

    // 3) El mapeo al formato del frontend es correcto
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        id: 1,
        nombre: 'Alumno1 Perez Lopez',
        grupo: 'GIDS6093-E',
        equipoProyecto: 'Equipo A',
        rol: 'Alumno',
      }),
    );

    // 4) Se consultó con la paginación y el filtro de rol correctos
    expect(prismaMock.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 10,
        orderBy: { usuNom: 'asc' },
        where: expect.objectContaining({
          rolUsuario: { rolUsuNom: { in: ['Alumno', 'Scrum Master'] } },
        }),
      }),
    );
    expect(prismaMock.usuario.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        rolUsuario: { rolUsuNom: { in: ['Alumno', 'Scrum Master'] } },
      }),
    });
  });

  it('CP-U-01b (valor límite): sin resultados, meta.totalPages = 1 y data vacía', async () => {
    prismaMock.usuario.count.mockResolvedValue(0);
    prismaMock.usuario.findMany.mockResolvedValue([]);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result.data).toHaveLength(0);
    expect(result.meta.totalItems).toBe(0);
    expect(result.meta.totalPages).toBe(1); // Math.ceil(0/10) || 1
  });

  it('CP-U-01c: la página 2 calcula skip = 10', async () => {
    prismaMock.usuario.count.mockResolvedValue(25);
    prismaMock.usuario.findMany.mockResolvedValue([]);

    await service.findAll({ page: 2, limit: 10 });

    expect(prismaMock.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('CP-U-01d: "buscar" agrega el filtro OR por nombre/apellido/email', async () => {
    prismaMock.usuario.count.mockResolvedValue(0);
    prismaMock.usuario.findMany.mockResolvedValue([]);

    await service.findAll({ page: 1, limit: 10, buscar: 'juan' });

    const whereEnviado = prismaMock.usuario.findMany.mock.calls[0][0].where;
    expect(whereEnviado.OR).toEqual([
      { usuNom: { contains: 'juan', mode: 'insensitive' } },
      { usuApp: { contains: 'juan', mode: 'insensitive' } },
      { usuEmail: { contains: 'juan', mode: 'insensitive' } },
    ]);
  });
});