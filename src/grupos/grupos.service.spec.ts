import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { GruposService } from './grupos.service';
import { PrismaService } from '../database/prisma.service';

describe('GruposService', () => {
  let service: GruposService;
  let prismaMock: {
    grupo: {
      findUnique: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      grupo: {
        findUnique: jest.fn(),
        create:     jest.fn(),
        findMany:   jest.fn(),
        update:     jest.fn(),
        delete:     jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GruposService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<GruposService>(GruposService);
  });

  // ── CP-U-02: caso principal ──────────────────────────────────────────────
  it('CP-U-02: create lanza ConflictException si el grupo ya existe', async () => {
    // El servicio llama prisma.grupo.findUnique (no findFirst)
    // → simulamos que el grupo ya existe
    prismaMock.grupo.findUnique.mockResolvedValue({
      grupoId: 1,
      grupoNom: 'GIDS6093-E',
    });

    await expect(
      service.create({ grupoNom: 'GIDS6093-E' }),
    ).rejects.toBeInstanceOf(ConflictException);

    // create() NO debe haberse invocado porque se cortó antes
    expect(prismaMock.grupo.create).not.toHaveBeenCalled();
  });

  // ── CP-U-02b: camino feliz ───────────────────────────────────────────────
  it('CP-U-02b: create persiste el grupo cuando el nombre no existe', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(null); // no existe → ok
    prismaMock.grupo.create.mockResolvedValue({
      grupoId: 2,
      grupoNom: 'GIDS6093-NUEVO',
    });

    const result = await service.create({ grupoNom: 'GIDS6093-NUEVO' });

    // Se llamó create con el DTO exacto
    expect(prismaMock.grupo.create).toHaveBeenCalledWith({
      data: { grupoNom: 'GIDS6093-NUEVO' },
    });
    expect(result.grupoNom).toBe('GIDS6093-NUEVO');
  });

  // ── CP-U-02c: findOne con ID inexistente ─────────────────────────────────
  it('CP-U-02c: findOne lanza NotFoundException si el grupo no existe', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
  });
});