import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { OposicionDto } from './dto/oposicion.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * DERECHO DE ACCESO (LGPDPPSO)
   * GET /perfil/mi-cuenta
   * Retorna toda la información del titular de los datos incluyendo relaciones,
   * sin exponer nunca la contraseña o hash de seguridad.
   */
  async getMiCuenta(userId: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId: userId },
      include: {
        rolUsuario: true,
        grupo: true,
      },
    });

    if (!usuario || usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new NotFoundException('Usuario no encontrado o cuenta cancelada.');
    }

    return {
      id: usuario.usuId,
      nombre: usuario.usuNom,
      apellidoPaterno: usuario.usuApp,
      apellidoMaterno: usuario.usuApm,
      nombreCompleto: [usuario.usuNom, usuario.usuApp, usuario.usuApm]
        .filter(Boolean)
        .join(' '),
      correo: usuario.usuEmail,
      rol: usuario.rolUsuario.rolUsuNom,
      rolId: usuario.rolId,
      grupo: usuario.grupo ? usuario.grupo.grupoNom : null,
      grupoId: usuario.grupoId,
      estadoCuenta: usuario.estadoCuenta,
      oposicionTratamiento: usuario.oposicionTratamiento,
      createdAt: usuario.createdAt,
    };
  }

  /**
   * DERECHO DE RECTIFICACIÓN (LGPDPPSO)
   * PATCH /perfil/actualizar
   * Permite al titular rectificar sus datos personales o grupo.
   * Regla de negocio: Los usuarios con rol Docente no pueden tener grupo.
   */
  async updatePerfil(userId: number, dto: UpdatePerfilDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId: userId },
      include: { rolUsuario: true },
    });

    if (!usuario || usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new NotFoundException('Usuario no encontrado o cuenta inactiva.');
    }

    // Regla de Negocio: Si incluye grupoId, verificar que el usuario sea Alumno
    if (dto.grupoId !== undefined && dto.grupoId !== null) {
      const esAlumno =
        usuario.rolUsuario.rolUsuNom.toLowerCase() === 'alumno' ||
        usuario.rolUsuario.rolUsuNom.toLowerCase() === 'scrum master';

      if (!esAlumno) {
        throw new UnauthorizedException('Los docentes no pueden tener grupo');
      }

      // Validar que el grupo exista
      const grupoExiste = await this.prisma.grupo.findUnique({
        where: { grupoId: dto.grupoId },
      });
      if (!grupoExiste) {
        throw new NotFoundException(`El grupo con ID ${dto.grupoId} no existe.`);
      }
    }

    const dataToUpdate: any = {};
    if (dto.nombre !== undefined) dataToUpdate.usuNom = dto.nombre.trim();
    if (dto.apellidoPaterno !== undefined)
      dataToUpdate.usuApp = dto.apellidoPaterno.trim();
    if (dto.apellidoMaterno !== undefined)
      dataToUpdate.usuApm = dto.apellidoMaterno?.trim() || null;
    if (dto.grupoId !== undefined) dataToUpdate.grupoId = dto.grupoId;

    const updatedUser = await this.prisma.usuario.update({
      where: { usuId: userId },
      data: dataToUpdate,
      include: {
        rolUsuario: true,
        grupo: true,
      },
    });

    return {
      message: 'Perfil rectificado y actualizado exitosamente.',
      usuario: {
        id: updatedUser.usuId,
        nombre: updatedUser.usuNom,
        apellidoPaterno: updatedUser.usuApp,
        apellidoMaterno: updatedUser.usuApm,
        nombreCompleto: [updatedUser.usuNom, updatedUser.usuApp, updatedUser.usuApm]
          .filter(Boolean)
          .join(' '),
        correo: updatedUser.usuEmail,
        rol: updatedUser.rolUsuario.rolUsuNom,
        rolId: updatedUser.rolId,
        grupo: updatedUser.grupo ? updatedUser.grupo.grupoNom : null,
        grupoId: updatedUser.grupoId,
        estadoCuenta: updatedUser.estadoCuenta,
        oposicionTratamiento: updatedUser.oposicionTratamiento,
      },
    };
  }

  /**
   * DERECHO DE OPOSICIÓN (LGPDPPSO)
   * PATCH /perfil/oposicion
   * Permite al titular oponerse o manifestar su consentimiento al tratamiento de sus datos personales.
   */
  async updateOposicion(userId: number, dto: OposicionDto) {
    const updated = await this.prisma.usuario.update({
      where: { usuId: userId },
      data: { oposicionTratamiento: dto.oposicion },
    });

    return {
      message: dto.oposicion
        ? 'Se ha registrado tu oposición al tratamiento de datos personales conforme a la LGPDPPSO.'
        : 'Se ha revocado la oposición al tratamiento de datos personales.',
      oposicionTratamiento: updated.oposicionTratamiento,
    };
  }

  /**
   * DESACTIVACIÓN DE CUENTA
   * PATCH /perfil/desactivar
   * Cambia el estado de la cuenta a INACTIVO.
   */
  async desactivarCuenta(userId: number) {
    const updated = await this.prisma.usuario.update({
      where: { usuId: userId },
      data: { estadoCuenta: 'INACTIVO' },
    });

    return {
      message:
        'Tu cuenta ha sido pausada/desactivada exitosamente. Podrás reactivarla cuando lo desees mediante el endpoint de reactivación.',
      estadoCuenta: updated.estadoCuenta,
    };
  }

  /**
   * REACTIVACIÓN DE CUENTA
   * PATCH /perfil/reactivar
   * Cambia el estado de la cuenta a ACTIVO.
   */
  async reactivarCuenta(userId: number) {
    const updated = await this.prisma.usuario.update({
      where: { usuId: userId },
      data: { estadoCuenta: 'ACTIVO' },
    });

    return {
      message:
        'Tu cuenta ha sido reactivada exitosamente. Ya tienes acceso completo a la plataforma.',
      estadoCuenta: updated.estadoCuenta,
    };
  }

  /**
   * DERECHO DE CANCELACIÓN / ANONIMIZACIÓN (LGPDPPSO)
   * DELETE /perfil/cancelar
   * Realiza un borrado lógico criptográfico y anonimización de la fila en PostgreSQL
   * utilizando una transacción ACID con prisma.$transaction.
   */
  async cancelarCuenta(userId: number) {
    const anonEmail = `anon_${userId}_${Date.now()}@sistema.local`;

    try {
      await this.prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.findUnique({
          where: { usuId: userId },
        });

        if (!usuario) {
          throw new NotFoundException('Usuario no encontrado.');
        }

        if (usuario.estadoCuenta === 'ANONIMIZADO') {
          throw new BadRequestException(
            'Esta cuenta ya ha sido cancelada y anonimizada previamente.',
          );
        }

        // Borrado lógico criptográfico mutando los datos de la fila original
        await tx.usuario.update({
          where: { usuId: userId },
          data: {
            usuNom: 'Usuario',
            usuApp: 'Anónimo',
            usuApm: null,
            usuEmail: anonEmail,
            usuPass: 'DELETED',
            estadoCuenta: 'ANONIMIZADO',
            oposicionTratamiento: true,
            grupoId: null,
          },
        });
      });

      return {
        message:
          'Cuenta cancelada y datos personales anonimizados irreversiblemente conforme a la LGPDPPSO.',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error al procesar la cancelación de cuenta: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * ACTUALIZAR / CAMBIAR CONTRASEÑA
   * PATCH /perfil/cambiar-password
   * Valida la contraseña actual, comprueba que la nueva sea distinta y la encripta con bcrypt.
   */
  async cambiarPassword(userId: number, dto: CambiarPasswordDto) {
    if (dto.passwordActual === dto.passwordNuevo) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente a la contraseña actual.',
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId: userId },
    });

    if (!usuario || usuario.estadoCuenta === 'ANONIMIZADO') {
      throw new NotFoundException('Usuario no encontrado o cuenta no disponible.');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.passwordActual,
      usuario.usuPass,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta.');
    }

    const newPasswordHash = await bcrypt.hash(
      dto.passwordNuevo,
      BCRYPT_SALT_ROUNDS,
    );

    await this.prisma.usuario.update({
      where: { usuId: userId },
      data: { usuPass: newPasswordHash },
    });

    return {
      message: 'Tu contraseña ha sido actualizada exitosamente.',
    };
  }
}
