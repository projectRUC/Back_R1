import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Actividad } from '../database/schemas/actividad.schema';
import { EstatusActividad } from '../common/providers/enums/estatus-actividad.enum';
import { Proyecto } from '../database/schemas/proyecto.schema';
import { CreateActividadDto, UpdateActividadDto, AddEvidenciaDto, UpdateEvidenciaDto } from './dto/actividad.dto';
import { AddComentarioDto, UpdateComentarioDto } from '../proyectos/dto/proyecto.dto';
import { AlertasService } from '../alertas/alertas.service';
import { PrismaService } from '../database/prisma.service';
import { TipoAlerta } from '../database/schemas/alerta.schema';
import { EmailService } from '../email/email.service';
import { CryptoService } from 'src/cryptoModule/CryptoService';

@Injectable()
export class ActividadesService {
  constructor(
    @InjectModel(Actividad.name) private actividadModel: Model<Actividad>,
    @InjectModel(Proyecto.name) private proyectoModel: Model<Proyecto>,
    private readonly alertasService: AlertasService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers de cifrado/descifrado
  // ---------------------------------------------------------------------

  /**
   * Descifra en memoria los comentarios y evidencias de una actividad
   * antes de devolverla al cliente. No modifica el documento en la BD.
   */
  private decryptActividad(actividad: Actividad): Actividad {
    if (actividad.comentarios && actividad.comentarios.length > 0) {
      actividad.comentarios = actividad.comentarios.map((c: any) => ({
        ...(c.toObject ? c.toObject() : c),
        comentario: this.safeDecrypt(c.comentario),
      })) as any;
    }

    if (actividad.evidencias && actividad.evidencias.length > 0) {
      actividad.evidencias = actividad.evidencias.map((e: any) => ({
        ...(e.toObject ? e.toObject() : e),
        descripcion: this.safeDecrypt(e.descripcion),
      })) as any;
    }

    return actividad;
  }

  private decryptActividades(actividades: Actividad[]): Actividad[] {
    return actividades.map(a => this.decryptActividad(a));
  }

  /**
   * Descifra sin lanzar excepción si el valor no está cifrado o viene vacío
   * (por ejemplo, datos antiguos creados antes de implementar el cifrado).
   */
  private safeDecrypt(value: string): string {
    if (!value) return value;
    try {
      return CryptoService.decrypt(value);
    } catch {
      return value;
    }
  }

  // ---------------------------------------------------------------------
  // CRUD de actividades
  // ---------------------------------------------------------------------

  async createActividad(dto: CreateActividadDto): Promise<Actividad> {
    const proyecto = await this.proyectoModel.findById(dto.proyecto_id);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    if (dto.sprint !== undefined) {
      const sprintExists = proyecto.sprints.some(s => s.num_sprint === dto.sprint);
      if (!sprintExists) {
        throw new BadRequestException(`El sprint ${dto.sprint} no existe en el proyecto`);
      }
    }

    if (dto.parcial !== undefined) {
      const parcialExists = proyecto.parciales.some(p => p.num_parcial === dto.parcial);
      if (!parcialExists) {
        throw new BadRequestException(`El parcial ${dto.parcial} no existe en el proyecto`);
      }
    }

    const nuevaActividad = new this.actividadModel({
      ...dto,
      proyecto_id: new Types.ObjectId(dto.proyecto_id),
      estatus: EstatusActividad.SIN_EMPEZAR,
      comentarios: [],
      evidencias: []
    });

    const act = await nuevaActividad.save();

    // Enviar correos a los asignados
    if (dto.asignados && dto.asignados.length > 0) {
      for (const asignado of dto.asignados) {
        const usuario = await this.prisma.usuario.findUnique({
          where: { usuId: asignado.usu_id },
        });
        if (usuario && usuario.usuEmail) {
          await this.emailService.enviarNotificacionActividad(
            usuario.usuEmail,
            usuario.usuNom,
            act.nom_actividad,
            proyecto.nombre,
          );
        }
      }
    }

    return this.decryptActividad(act);
  }

  async getActividadesByProyecto(proyecto_id: string): Promise<Actividad[]> {
    const actividades = await this.actividadModel.find({ proyecto_id: new Types.ObjectId(proyecto_id) }).exec();
    return this.decryptActividades(actividades);
  }

  async getActividades(): Promise<Actividad[]> {
    const actividades = await this.actividadModel.find().exec();
    return this.decryptActividades(actividades);
  }

  async getActividadById(id: string): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id).exec();
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    return this.decryptActividad(actividad);
  }

  async updateActividad(id: string, dto: UpdateActividadDto): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');

    if (dto.sprint !== undefined || dto.parcial !== undefined) {
      const proyecto = await this.proyectoModel.findById(actividad.proyecto_id);
      if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

      if (dto.sprint !== undefined && dto.sprint !== null) {
        const sprintExists = proyecto.sprints.some(s => s.num_sprint === dto.sprint);
        if (!sprintExists) throw new BadRequestException(`El sprint ${dto.sprint} no existe en el proyecto`);
      }

      if (dto.parcial !== undefined && dto.parcial !== null) {
        const parcialExists = proyecto.parciales.some(p => p.num_parcial === dto.parcial);
        if (!parcialExists) throw new BadRequestException(`El parcial ${dto.parcial} no existe en el proyecto`);
      }
    }

    // Intercepción Criterio 2: Alertar si se marca terminada sin evidencias
    if (dto.estatus === EstatusActividad.TERMINADO && actividad.estatus !== EstatusActividad.TERMINADO) {
      const tieneEvidencia = actividad.evidencias && actividad.evidencias.length > 0;
      const tieneComentarios = actividad.comentarios && actividad.comentarios.length > 0;

      if (!tieneEvidencia && !tieneComentarios) {
        // Encontrar al Scrum Master
        const equipo = await this.prisma.equipo.findUnique({
          where: { eqId: actividad.eq_id },
          select: { scrumMasterId: true },
        });

        if (equipo && equipo.scrumMasterId) {
          await this.alertasService.crearAlerta({
            scrum_master_id: equipo.scrumMasterId,
            actividad_id: actividad._id as any,
            tipo: TipoAlerta.EVIDENCIA_FALTANTE,
            mensaje: `La actividad "${actividad.nom_actividad}" fue marcada como "Terminada" pero no cuenta con comentarios ni evidencias.`,
          });
        }
      }
    }

    // Identificar nuevos asignados para enviarles correo
    let nuevosAsignados: any[] = [];
    if (dto.asignados && dto.asignados.length > 0) {
      const idsActuales = actividad.asignados.map(a => a.usu_id);
      nuevosAsignados = dto.asignados.filter(a => !idsActuales.includes(a.usu_id));
    }

    Object.assign(actividad, dto);
    const actGuardada = await actividad.save();

    // Enviar correos a los nuevos asignados
    if (nuevosAsignados.length > 0) {
      const proyecto = await this.proyectoModel.findById(actividad.proyecto_id);
      for (const asignado of nuevosAsignados) {
        const usuario = await this.prisma.usuario.findUnique({
          where: { usuId: asignado.usu_id },
        });
        if (usuario && usuario.usuEmail && proyecto) {
          await this.emailService.enviarNotificacionActividad(
            usuario.usuEmail,
            usuario.usuNom,
            actGuardada.nom_actividad,
            proyecto.nombre, // nombre del proyecto
          );
        }
      }
    }

    return this.decryptActividad(actGuardada);
  }

  async deleteActividad(id: string): Promise<Actividad> {
    const actividad = await this.actividadModel.findByIdAndDelete(id).exec();
    if (!actividad) throw new NotFoundException('Actividad no encontrada');
    return this.decryptActividad(actividad);
  }

  // ---------------------------------------------------------------------
  // Comentarios
  // ---------------------------------------------------------------------

  async addComentario(id: string, dto: AddComentarioDto): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');

    actividad.comentarios.push({
      usu_id: dto.usu_id,
      comentario: CryptoService.encrypt(dto.comentario)
    } as any);

    const guardada = await actividad.save();
    return this.decryptActividad(guardada);
  }

  async updateComentario(id: string, comment_id: string, dto: UpdateComentarioDto): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');

    const cIndex = actividad.comentarios.findIndex((c: any) => c._id.toString() === comment_id);
    if (cIndex === -1) throw new NotFoundException('Comentario no encontrado');

    if (actividad.comentarios[cIndex].usu_id !== dto.req_usu_id) {
      throw new ConflictException('No tienes permisos para editar este comentario');
    }

    actividad.comentarios[cIndex].comentario = CryptoService.encrypt(dto.comentario);
    actividad.markModified('comentarios');
    const guardada = await actividad.save();
    return this.decryptActividad(guardada);
  }

  // ---------------------------------------------------------------------
  // Evidencias
  // ---------------------------------------------------------------------

  async addEvidencia(id: string, dto: AddEvidenciaDto): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');

    actividad.evidencias.push({
      usu_id: dto.usu_id,
      descripcion: CryptoService.encrypt(dto.descripcion),
      archivos: dto.archivos || []
    } as any);

    const guardada = await actividad.save();
    return this.decryptActividad(guardada);
  }

  async updateEvidencia(id: string, evidencia_id: string, dto: UpdateEvidenciaDto): Promise<Actividad> {
    const actividad = await this.actividadModel.findById(id);
    if (!actividad) throw new NotFoundException('Actividad no encontrada');

    const eIndex = actividad.evidencias.findIndex((e: any) => e._id.toString() === evidencia_id);
    if (eIndex === -1) throw new NotFoundException('Evidencia no encontrada');

    if (actividad.evidencias[eIndex].usu_id !== dto.req_usu_id) {
      throw new ConflictException('No tienes permisos para editar esta evidencia');
    }

    if (dto.descripcion !== undefined) {
      actividad.evidencias[eIndex].descripcion = CryptoService.encrypt(dto.descripcion);
    }
    if (dto.archivos !== undefined) actividad.evidencias[eIndex].archivos = dto.archivos;

    actividad.markModified('evidencias');
    const guardada = await actividad.save();
    return this.decryptActividad(guardada);
  }
}