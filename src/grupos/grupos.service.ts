import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';

@Injectable()
export class GruposService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un nuevo grupo escolar verificando que el nombre no exista.
   */
  async create(createGrupoDto: CreateGrupoDto) {
    const existe = await this.prisma.grupo.findUnique({
      where: { grupoNom: createGrupoDto.grupoNom },
    });

    if (existe) {
      throw new ConflictException(
        `El grupo escolar '${createGrupoDto.grupoNom}' ya existe en el sistema.`,
      );
    }

    return await this.prisma.grupo.create({
      data: createGrupoDto,
    });
  }

  /**
   * Obtiene todos los grupos registrados.
   */
  async findAll() {
    return await this.prisma.grupo.findMany({
      orderBy: { grupoNom: 'asc' },
    });
  }

  /**
   * Obtiene el detalle de un grupo específico.
   */
  async findOne(id: number) {
    const grupo = await this.prisma.grupo.findUnique({
      where: { grupoId: id },
    });

    if (!grupo) {
      throw new NotFoundException(`El grupo con ID ${id} no fue encontrado.`);
    }

    return grupo;
  }

  /**
   * Actualiza la información de un grupo.
   */
  async update(id: number, updateGrupoDto: UpdateGrupoDto) {
    // Validar que exista
    await this.findOne(id);

    // Si intenta actualizar el nombre, validar que no colisione con otro grupo
    if (updateGrupoDto.grupoNom) {
      const existe = await this.prisma.grupo.findUnique({
        where: { grupoNom: updateGrupoDto.grupoNom },
      });
      if (existe && existe.grupoId !== id) {
        throw new ConflictException(
          `El nombre de grupo '${updateGrupoDto.grupoNom}' ya está en uso.`,
        );
      }
    }

    return await this.prisma.grupo.update({
      where: { grupoId: id },
      data: updateGrupoDto,
    });
  }

  /**
   * Elimina un grupo del sistema.
   * Nota: No se puede eliminar si hay usuarios o equipos enlazados (debido a restricción de llave foránea).
   */
  async remove(id: number) {
    const grupo = await this.findOne(id);

    try {
      await this.prisma.grupo.delete({
        where: { grupoId: id },
      });
      return {
        message: `El grupo '${grupo.grupoNom}' (ID: ${id}) fue eliminado exitosamente.`,
      };
    } catch (error) {
      throw new ConflictException(
        'No se puede eliminar este grupo porque tiene usuarios o equipos asociados.',
      );
    }
  }
}
