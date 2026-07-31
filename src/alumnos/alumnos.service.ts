import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GetAlumnosFilterDto } from './dto/get-alumnos-filter.dto';

@Injectable()
export class AlumnosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: GetAlumnosFilterDto) {
    const { page = 1, limit = 10, buscar, grupo, equipo } = filters;
    const skip = (page - 1) * limit;

    // Construir la condición principal "where"
    const whereCondition: any = {
      rolUsuario: {
        rolUsuNom: { in: ['Alumno', 'Scrum Master'] },
      },
    };

    if (buscar) {
      whereCondition.OR = [
        { usuNom: { contains: buscar, mode: 'insensitive' } },
        { usuApp: { contains: buscar, mode: 'insensitive' } },
        { usuEmail: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    if (grupo) {
      whereCondition.grupo = {
        grupoNom: grupo,
      };
    }

    if (equipo) {
      // Si piden filtro por equipo, el alumno debe estar en ese equipo
      // como integrante normal o como Scrum Master del equipo.
      whereCondition.AND = [
        {
          OR: [
            { equiposAlumno: { some: { equipo: { eqNom: equipo } } } },
            { equiposScrumMaster: { some: { eqNom: equipo } } },
          ],
        },
      ];
    }

    // Ejecutar consultas en paralelo: count y findMany
    const [totalItems, alumnos] = await Promise.all([
      this.prisma.usuario.count({ where: whereCondition }),
      this.prisma.usuario.findMany({
        where: whereCondition,
        skip,
        take: limit,
        include: {
          rolUsuario: true,
          grupo: true,
          equiposAlumno: {
            include: {
              equipo: { select: { eqNom: true, proyecto: { select: { proyectoNom: true } } } },
              rolEquipo: { select: { rolEqNom: true } },
            },
          },
          equiposScrumMaster: {
            select: { eqNom: true, proyecto: { select: { proyectoNom: true } } },
          },
        },
        orderBy: { usuNom: 'asc' },
      }),
    ]);

    // Mapear los resultados al formato esperado por el frontend
    const data = alumnos.map((alu) => {
      const equipos: Array<{ nombreEquipo: string; rol: string; proyecto?: string }> = alu.equiposAlumno.map((eq) => ({
        nombreEquipo: eq.equipo.eqNom,
        rol: eq.rolEquipo.rolEqNom,
        proyecto: eq.equipo.proyecto?.proyectoNom || 'Sin proyecto',
      }));

      alu.equiposScrumMaster.forEach((sm) => {
        if (!equipos.some((e) => e.nombreEquipo === sm.eqNom)) {
          equipos.push({
            nombreEquipo: sm.eqNom,
            rol: 'Scrum Master',
            proyecto: sm.proyecto?.proyectoNom || 'Sin proyecto',
          });
        }
      });

      const nombreCompleto = [alu.usuNom, alu.usuApp, alu.usuApm].filter(Boolean).join(' ');

      return {
        id: alu.usuId,
        nombre: nombreCompleto,
        grupo: alu.grupo?.grupoNom || 'Sin grupo asignado',
        equipoProyecto: equipos.length > 0 ? equipos[0].nombreEquipo : 'Sin equipo asignado',
        rol: alu.rolUsuario.rolUsuNom,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(nombreCompleto)}&background=random`,
      };
    });

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      data,
      meta: {
        totalItems,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }
}
