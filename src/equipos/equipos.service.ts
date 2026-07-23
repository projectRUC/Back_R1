import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';

/**
 * EquiposService — Lógica de negocio para la gestión de Equipos y Proyectos PAEC.
 *
 * Implementa el manejo transaccional para garantizar la integridad referencial
 * al crear un equipo, su proyecto asociado, la vinculación con el grupo escolar
 * y la inscripción de sus alumnos integrantes junto al nombramiento del Scrum Master.
 */
@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un nuevo equipo PAEC de forma transaccional.
   *
   * @param createEquipoDto DTO con los datos del equipo, proyecto, grupo e integrantes.
   * @returns El equipo creado con sus relaciones completas pobladas.
   */
  async create(createEquipoDto: CreateEquipoDto) {
    const {
      nombre,
      nombreProyecto,
      grupoId,
      integrantes,
      scrumMasterId,
    } = createEquipoDto;

    // Asegurarnos de que el scrumMasterId esté en la lista única de integrantes
    const integrantesSet = new Set(integrantes);
    integrantesSet.add(scrumMasterId);
    const integrantesUnicos = Array.from(integrantesSet);

    // Ejecución dentro de una transacción ACID
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar que el grupo escolar exista
      const grupo = await tx.grupo.findUnique({
        where: { grupoId },
      });
      if (!grupo) {
        throw new NotFoundException(
          `El grupo escolar con ID ${grupoId} no existe en el sistema.`,
        );
      }

      // 2. Validar que el usuario Scrum Master exista
      const scrumMaster = await tx.usuario.findUnique({
        where: { usuId: scrumMasterId },
      });
      if (!scrumMaster) {
        throw new NotFoundException(
          `El alumno designado como Scrum Master (ID ${scrumMasterId}) no existe.`,
        );
      }

      // 3. Validar que todos los integrantes del arreglo existan en la base de datos
      const usuariosExistentes = await tx.usuario.findMany({
        where: {
          usuId: { in: integrantesUnicos },
        },
      });

      if (usuariosExistentes.length !== integrantesUnicos.length) {
        throw new BadRequestException(
          'Uno o más IDs de integrantes proporcionados no corresponden a usuarios existentes.',
        );
      }

      // 4. Obtener roles de equipo ('Scrum Master' y 'Developer') desde el catálogo
      const rolSm =
        (await tx.rolEquipo.findUnique({ where: { rolEqNom: 'Scrum Master' } })) ??
        (await tx.rolEquipo.findFirst({ where: { rolEqId: 1 } }));
      const rolDev =
        (await tx.rolEquipo.findUnique({ where: { rolEqNom: 'Developer' } })) ??
        (await tx.rolEquipo.findFirst({ where: { rolEqId: 2 } }));

      if (!rolSm || !rolDev) {
        throw new BadRequestException(
          'Los roles de equipo no están inicializados en la base de datos. Ejecute el seed.',
        );
      }

      // 5. Crear el Proyecto asociado al equipo
      const proyecto = await tx.proyecto.create({
        data: {
          proyectoNom: nombreProyecto,
          proyectoDesc: `Proyecto PAEC del equipo ${nombre} (${grupo.grupoNom})`,
        },
      });

      // 6. Crear el Equipo relacionándolo con el Grupo, Proyecto y Scrum Master
      const equipo = await tx.equipo.create({
        data: {
          eqNom: nombre,
          grupoId,
          proyectoId: proyecto.proyectoId,
          scrumMasterId,
        },
      });

      // 7. Insertar a los integrantes en la tabla intermedia EquipoAlumno (N:M)
      const dataIntegrantes = integrantesUnicos.map((usuId) => ({
        usuId,
        eqId: equipo.eqId,
        // Si el usuario es el Scrum Master se le asigna el rol SM, si no, Developer
        rolEqId: usuId === scrumMasterId ? rolSm.rolEqId : rolDev.rolEqId,
      }));

      await tx.equipoAlumno.createMany({
        data: dataIntegrantes,
      });

      // 8. Retornar el detalle completo del equipo recién creado
      return await tx.equipo.findUnique({
        where: { eqId: equipo.eqId },
        include: {
          proyecto: true,
          grupo: true,
          scrumMaster: {
            select: {
              usuId: true,
              usuNom: true,
              usuApp: true,
              usuApm: true,
              usuEmail: true,
            },
          },
          equiposAlumno: {
            include: {
              usuario: {
                select: {
                  usuId: true,
                  usuNom: true,
                  usuApp: true,
                  usuApm: true,
                  usuEmail: true,
                },
              },
              rolEquipo: true,
            },
          },
        },
      });
    });
  }

  /**
   * Obtiene los detalles completos de un equipo PAEC por su ID.
   *
   * @param id ID numérico entero del equipo.
   * @returns Información del proyecto, grupo escolar e integrantes (con Scrum Master identificado).
   */
  async findOne(id: number) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { eqId: id },
      include: {
        proyecto: true,
        grupo: true,
        scrumMaster: {
          select: {
            usuId: true,
            usuNom: true,
            usuApp: true,
            usuApm: true,
            usuEmail: true,
            rolUsuario: true,
          },
        },
        equiposAlumno: {
          include: {
            usuario: {
              select: {
                usuId: true,
                usuNom: true,
                usuApp: true,
                usuApm: true,
                usuEmail: true,
              },
            },
            rolEquipo: true,
          },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException(
        `El equipo con el ID ${id} no fue encontrado.`,
      );
    }

    return equipo;
  }

  /**
   * Actualiza transaccionalmente un equipo PAEC, su proyecto e integrantes.
   *
   * @param id ID numérico entero del equipo a actualizar.
   * @param updateEquipoDto DTO con los campos parciales a modificar.
   */
  async update(id: number, updateEquipoDto: UpdateEquipoDto) {
    const {
      nombre,
      nombreProyecto,
      grupoId,
      integrantes,
      scrumMasterId,
    } = updateEquipoDto;

    // 1. Verificar que el equipo exista antes de actualizar
    const equipoExistente = await this.findOne(id);

    return await this.prisma.$transaction(async (tx) => {
      // Si se envía un nuevo grupoId, validar que exista en el catálogo
      if (grupoId !== undefined) {
        const grupo = await tx.grupo.findUnique({ where: { grupoId } });
        if (!grupo) {
          throw new NotFoundException(
            `El grupo escolar con ID ${grupoId} no existe en el sistema.`,
          );
        }
      }

      // Si se envía un nuevo scrumMasterId, validar que exista
      if (scrumMasterId !== undefined) {
        const scrumMaster = await tx.usuario.findUnique({
          where: { usuId: scrumMasterId },
        });
        if (!scrumMaster) {
          throw new NotFoundException(
            `El alumno designado como Scrum Master (ID ${scrumMasterId}) no existe.`,
          );
        }
      }

      // 2. Si se proporcionó nombreProyecto y el equipo tiene un proyecto vinculado, actualizarlo
      if (nombreProyecto !== undefined && equipoExistente.proyectoId) {
        await tx.proyecto.update({
          where: { proyectoId: equipoExistente.proyectoId },
          data: {
            proyectoNom: nombreProyecto,
          },
        });
      }

      // 3. Actualizar la información propia de la tabla Equipo si se enviaron cambios
      const datosEquipoUpdate: any = {};
      if (nombre !== undefined) datosEquipoUpdate.eqNom = nombre;
      if (grupoId !== undefined) datosEquipoUpdate.grupoId = grupoId;
      if (scrumMasterId !== undefined) datosEquipoUpdate.scrumMasterId = scrumMasterId;

      if (Object.keys(datosEquipoUpdate).length > 0) {
        await tx.equipo.update({
          where: { eqId: id },
          data: datosEquipoUpdate,
        });
      }

      // 4. Si se proporcionó un nuevo arreglo de integrantes, reconstruir las relaciones en EquipoAlumno
      if (integrantes !== undefined) {
        const smIdEfectivo =
          scrumMasterId !== undefined
            ? scrumMasterId
            : equipoExistente.scrumMasterId;

        const integrantesSet = new Set(integrantes);
        if (smIdEfectivo !== null && smIdEfectivo !== undefined) {
          integrantesSet.add(smIdEfectivo);
        }
        const integrantesUnicos = Array.from(integrantesSet);

        // Validar que todos existan
        const usuariosExistentes = await tx.usuario.findMany({
          where: { usuId: { in: integrantesUnicos } },
        });
        if (usuariosExistentes.length !== integrantesUnicos.length) {
          throw new BadRequestException(
            'Uno o más IDs de integrantes proporcionados no existen en el sistema.',
          );
        }

        // Obtener roles de equipo del catálogo
        const rolSm =
          (await tx.rolEquipo.findUnique({ where: { rolEqNom: 'Scrum Master' } })) ??
          (await tx.rolEquipo.findFirst({ where: { rolEqId: 1 } }));
        const rolDev =
          (await tx.rolEquipo.findUnique({ where: { rolEqNom: 'Developer' } })) ??
          (await tx.rolEquipo.findFirst({ where: { rolEqId: 2 } }));

        if (!rolSm || !rolDev) {
          throw new BadRequestException(
            'Roles de equipo no inicializados. Ejecute npm run seed.',
          );
        }

        // Limpiar integrantes anteriores
        await tx.equipoAlumno.deleteMany({
          where: { eqId: id },
        });

        // Insertar la nueva lista con sus respectivos roles
        const dataIntegrantes = integrantesUnicos.map((usuId) => ({
          usuId,
          eqId: id,
          rolEqId: usuId === smIdEfectivo ? rolSm.rolEqId : rolDev.rolEqId,
        }));

        await tx.equipoAlumno.createMany({
          data: dataIntegrantes,
        });
      }

      // 5. Retornar el equipo actualizado completo
      return await tx.equipo.findUnique({
        where: { eqId: id },
        include: {
          proyecto: true,
          grupo: true,
          scrumMaster: {
            select: {
              usuId: true,
              usuNom: true,
              usuApp: true,
              usuApm: true,
              usuEmail: true,
              rolUsuario: true,
            },
          },
          equiposAlumno: {
            include: {
              usuario: {
                select: {
                  usuId: true,
                  usuNom: true,
                  usuApp: true,
                  usuApm: true,
                  usuEmail: true,
                },
              },
              rolEquipo: true,
            },
          },
        },
      });
    });
  }

  /**
   * Elimina un equipo PAEC y su proyecto asociado en cascada.
   *
   * @param id ID numérico entero del equipo a eliminar.
   */
  async remove(id: number) {
    const equipo = await this.findOne(id);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Eliminar el equipo (EquipoAlumno se elimina en cascada por Prisma)
      await tx.equipo.delete({
        where: { eqId: id },
      });

      // 2. Eliminar el proyecto asociado para no dejar registros huérfanos
      if (equipo.proyectoId) {
        await tx.proyecto.delete({
          where: { proyectoId: equipo.proyectoId },
        });
      }

      return {
        message: `El equipo "${equipo.eqNom}" (ID: ${id}) y su proyecto fueron eliminados exitosamente.`,
      };
    });
  }
}
