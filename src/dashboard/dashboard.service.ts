import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../database/prisma.service';
import { Proyecto } from '../database/schemas/proyecto.schema';
import { Actividad } from '../database/schemas/actividad.schema';
import { EstatusActividad } from '../common/providers/enums/estatus-actividad.enum';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Proyecto.name) private readonly proyectoModel: Model<Proyecto>,
    @InjectModel(Actividad.name) private readonly actividadModel: Model<Actividad>,
  ) {}

  /**
   * Obtiene información ligera y básica de Proyectos y Equipos a los que pertenece
   * exclusivamente el Alumno (o Scrum Master).
   * Evita sobrecarga al proyectar solo campos imprescindibles.
   */
  async getAlumnoProyectosEquipos(usuId: number) {
    // 1. Obtener equipos donde el usuario es integrante o Scrum Master en Prisma
    const equipos = await this.prisma.equipo.findMany({
      where: {
        OR: [
          { equiposAlumno: { some: { usuId } } },
          { scrumMasterId: usuId },
        ],
      },
      include: {
        proyecto: true,
        grupo: true,
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
            rolEquipo: {
              select: { rolEqNom: true },
            },
          },
        },
        scrumMaster: {
          select: {
            usuId: true,
            usuNom: true,
            usuApp: true,
            usuApm: true,
            usuEmail: true,
          },
        },
      },
    });

    const nombresProyectos = equipos
      .map((e) => e.proyecto?.proyectoNom)
      .filter((nom): nom is string => Boolean(nom));

    // 2. Obtener fechas de inicio y fin desde los documentos de Proyectos en MongoDB (ligeramente proyectadas)
    const mongoProyectos = await this.proyectoModel
      .find({ nombre: { $in: nombresProyectos } })
      .select('nombre fecha_inicio fecha_fin')
      .lean()
      .exec();

    // 3. Mapear tarjetas de Proyectos
    const proyectosCards = equipos
      .filter((e) => e.proyecto)
      .map((e) => {
        const p = e.proyecto!;
        const mongoP = mongoProyectos.find((mp) => mp.nombre === p.proyectoNom);
        return {
          id: p.proyectoId,
          equipoId: e.eqId,
          nombreProyecto: p.proyectoNom,
          nombreEquipo: e.eqNom,
          fechaInicio: mongoP?.fecha_inicio || p.createdAt || null,
          fechaFin: mongoP?.fecha_fin || null,
          grupo: e.grupo?.grupoNom || '',
        };
      });

    // 4. Mapear tarjetas de Equipos
    const equiposCards = equipos.map((e) => {
      const miembros = e.equiposAlumno.map((m) => ({
        nombre: [m.usuario.usuNom, m.usuario.usuApp, m.usuario.usuApm]
          .filter(Boolean)
          .join(' '),
        rol: m.rolEquipo.rolEqNom,
        correo: m.usuario.usuEmail,
      }));

      // Si tiene un Scrum Master designado y no estaba en el arreglo intermedio, agregarlo al inicio
      if (
        e.scrumMaster &&
        !miembros.some((m) => m.correo === e.scrumMaster?.usuEmail)
      ) {
        miembros.unshift({
          nombre: [e.scrumMaster.usuNom, e.scrumMaster.usuApp, e.scrumMaster.usuApm]
            .filter(Boolean)
            .join(' '),
          rol: 'Scrum Master',
          correo: e.scrumMaster.usuEmail,
        });
      }

      return {
        id: e.eqId,
        proyectoId: e.proyecto?.proyectoId || null,
        nombreEquipo: e.eqNom,
        nombreProyecto: e.proyecto?.proyectoNom || 'Sin proyecto asignado',
        grupo: e.grupo?.grupoNom || '',
        miembros,
      };
    });

    return {
      proyectos: proyectosCards,
      equipos: equiposCards,
    };
  }

  /**
   * Obtiene información básica y optimizada de las Actividades correspondientes
   * al equipo y proyecto del Alumno/Scrum Master.
   * Sin cargar historiales masivos de comentarios ni archivos adjuntos pesados.
   */
  async getAlumnoActividades(usuId: number) {
    const equipos = await this.prisma.equipo.findMany({
      where: {
        OR: [
          { equiposAlumno: { some: { usuId } } },
          { scrumMasterId: usuId },
        ],
      },
      select: {
        eqId: true,
        eqNom: true,
        proyectoId: true,
        proyecto: { select: { proyectoNom: true } },
      },
    });

    const eqIds = equipos.map((e) => e.eqId);
    const nombresProyectos = equipos
      .map((e) => e.proyecto?.proyectoNom)
      .filter((nom): nom is string => Boolean(nom));

    const mongoProyectos = await this.proyectoModel
      .find({ nombre: { $in: nombresProyectos } })
      .select('_id nombre')
      .lean()
      .exec();

    const proyectoIds = mongoProyectos.map((p) => p._id);

    // Consulta ligera en Actividades MongoDB omitiendo comentarios, archivos y evidencias
    const actividades = await this.actividadModel
      .find({
        $or: [
          { eq_id: { $in: eqIds } },
          { proyecto_id: { $in: proyectoIds } },
          { 'asignados.usu_id': usuId },
        ],
      })
      .select('nom_actividad proyecto_id eq_id fecha_inicio fecha_fin estatus asignados')
      .lean()
      .exec();

    return actividades.map((act) => {
      const proy = mongoProyectos.find(
        (p) => String(p._id) === String(act.proyecto_id),
      );
      const eq = equipos.find((e) => e.eqId === act.eq_id);
      const soyAsignado = (act.asignados || []).some((a) => a.usu_id === usuId);

      return {
        id: String(act._id),
        nombreActividad: act.nom_actividad,
        nombreProyecto:
          proy?.nombre || eq?.proyecto?.proyectoNom || 'Proyecto Asignado',
        fechaInicio: act.fecha_inicio || null,
        fechaFin: act.fecha_fin || null,
        estatus: act.estatus,
        soyAsignado,
      };
    });
  }

  /**
   * Obtiene para el Docente tarjetas de información básica de TODOS los proyectos del sistema
   * con fechas hidratadas sin recargar payloads innecesarios.
   */
  async getDocenteProyectos() {
    const equipos = await this.prisma.equipo.findMany({
      include: {
        proyecto: true,
        grupo: true,
      },
    });

    const nombresProyectos = equipos
      .map((e) => e.proyecto?.proyectoNom)
      .filter((nom): nom is string => Boolean(nom));

    const mongoProyectos = await this.proyectoModel
      .find({ nombre: { $in: nombresProyectos } })
      .select('nombre fecha_inicio fecha_fin')
      .lean()
      .exec();

    return equipos
      .filter((e) => e.proyecto)
      .map((e) => {
        const p = e.proyecto!;
        const mongoP = mongoProyectos.find((mp) => mp.nombre === p.proyectoNom);
        return {
          id: p.proyectoId,
          equipoId: e.eqId,
          nombreProyecto: p.proyectoNom,
          nombreEquipo: e.eqNom,
          fechaInicio: mongoP?.fecha_inicio || p.createdAt || null,
          fechaFin: mongoP?.fecha_fin || null,
          grupo: e.grupo?.grupoNom || 'Sin grupo',
        };
      });
  }

  /**
   * Obtiene para el Docente tarjetas con los datos de todos los alumnos registrados,
   * adjuntando sus equipos, rol y grupo escolar de forma sintetizada.
   */
  async getDocenteAlumnos() {
    const alumnos = await this.prisma.usuario.findMany({
      where: {
        rolUsuario: {
          rolUsuNom: { in: ['Alumno', 'Scrum Master'] },
        },
      },
      include: {
        rolUsuario: true,
        grupo: true,
        equiposAlumno: {
          include: {
            equipo: {
              select: {
                eqNom: true,
                proyecto: { select: { proyectoNom: true } },
              },
            },
            rolEquipo: { select: { rolEqNom: true } },
          },
        },
        equiposScrumMaster: {
          select: {
            eqNom: true,
            proyecto: { select: { proyectoNom: true } },
          },
        },
      },
      orderBy: { usuNom: 'asc' },
    });

    return alumnos.map((alu) => {
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

      const nombreCompleto = [alu.usuNom, alu.usuApp, alu.usuApm]
        .filter(Boolean)
        .join(' ');

      return {
        id: alu.usuId,
        nombreCompleto,
        correo: alu.usuEmail,
        rol: alu.rolUsuario.rolUsuNom,
        grupo: alu.grupo?.grupoNom || 'Sin grupo asignado',
        equipos,
      };
    });
  }

  /**
   * POST /dashboard/alumno/crear-proyecto-equipo
   * Crea un proyecto en MongoDB y su par relacional en PostgreSQL (Prisma) asignando
   * al alumno creador como líder y primer miembro del equipo.
   */
  async crearProyectoEquipo(
    usuId: number,
    dto: {
      nombreProyecto: string;
      descripcion?: string;
      fechaInicio: string;
      fechaFin: string;
      nombreEquipo: string;
    },
  ) {
    // 1. Obtener información del usuario creador y su grupo escolar
    const usuario = await this.prisma.usuario.findUnique({
      where: { usuId },
    });
    if (!usuario) {
      throw new NotFoundException('El usuario auténtico no se encontró.');
    }

    let grupoId = usuario.grupoId;
    if (!grupoId) {
      // Si el alumno no tiene grupo asignado aún, asignar el primero disponible o crear uno base
      const grupoGeneral =
        (await this.prisma.grupo.findFirst()) ??
        (await this.prisma.grupo.create({
          data: {
            grupoNom: 'Grupo General PAEC',
            grupoDesc: 'Grupo asignado para proyectos estudiantiles',
          },
        }));
      grupoId = grupoGeneral.grupoId;
    }

    // 2. Resolver el rol del creador del equipo
    const rolSm =
      (await this.prisma.rolEquipo.findUnique({
        where: { rolEqNom: 'Scrum Master' },
      })) ??
      (await this.prisma.rolEquipo.findFirst({
        where: { rolEqNom: 'Alumno' },
      })) ??
      (await this.prisma.rolEquipo.findFirst());

    if (!rolSm) {
      throw new BadRequestException('El sistema carece de roles de equipo registrados.');
    }

    // 3. Crear el documento del Proyecto en MongoDB
    const mongoProyecto = new this.proyectoModel({
      nombre: dto.nombreProyecto,
      descripcion: dto.descripcion || `Proyecto del equipo ${dto.nombreEquipo}`,
      fecha_inicio: new Date(dto.fechaInicio),
      fecha_fin: new Date(dto.fechaFin),
      parciales: [],
      sprints: [],
    });
    await mongoProyecto.save();

    // 4. Crear de forma transaccional el proyecto y equipo relacional en Prisma
    const res = await this.prisma.$transaction(async (tx) => {
      const proyecto = await tx.proyecto.create({
        data: {
          proyectoNom: dto.nombreProyecto,
          proyectoDesc:
            dto.descripcion || `Proyecto escolar de ${dto.nombreEquipo}`,
        },
      });

      const equipo = await tx.equipo.create({
        data: {
          eqNom: dto.nombreEquipo,
          grupoId: grupoId!,
          proyectoId: proyecto.proyectoId,
          scrumMasterId: usuId,
        },
      });

      // Asegurar al autor como el primer miembro de la relación de equipo
      await tx.equipoAlumno.create({
        data: {
          usuId,
          eqId: equipo.eqId,
          rolEqId: rolSm.rolEqId,
        },
      });

      return {
        proyectoId: proyecto.proyectoId,
        equipoId: equipo.eqId,
      };
    });

    return {
      message: 'Proyecto y equipo creados exitosamente',
      proyectoId: res.proyectoId,
      equipoId: res.equipoId,
    };
  }

  /**
   * GET /dashboard/detalle-proyecto-equipo/:equipoId
   * Consume datos relacionales del Equipo (miembros) y datos documentales de su Proyecto.
   */
  async getDetalleProyectoEquipo(equipoId: number) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { eqId: equipoId },
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
          orderBy: { eqAluId: 'asc' },
        },
      },
    });

    if (!equipo) {
      throw new NotFoundException('El equipo especificado no existe en la base de datos.');
    }

    let mongoInfo: any = null;
    if (equipo.proyecto?.proyectoNom) {
      mongoInfo = await this.proyectoModel
        .findOne({ nombre: equipo.proyecto.proyectoNom })
        .lean()
        .exec();
    }

    // Construir la lista de miembros, asegurando que el Alumno creador sea el primero en la colección
    const miembros = equipo.equiposAlumno.map((m) => {
      const nombreCompleto = [
        m.usuario.usuNom,
        m.usuario.usuApp,
        m.usuario.usuApm,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        usuId: m.usuario.usuId,
        nombre: nombreCompleto,
        rol: m.rolEquipo.rolEqNom,
        correo: m.usuario.usuEmail,
        esCreador: m.usuario.usuId === equipo.scrumMasterId,
      };
    });

    miembros.sort((a, b) => (b.esCreador ? 1 : 0) - (a.esCreador ? 1 : 0));

    // Consultar actividades en MongoDB vinculadas a este equipo o proyecto
    const actividadesMongo = await this.actividadModel
      .find({
        $or: [
          { eq_id: equipo.eqId },
          ...(mongoInfo ? [{ proyecto_id: String(mongoInfo._id) }] : []),
        ],
      })
      .select('nom_actividad fecha_inicio fecha_fin estatus asignados')
      .lean()
      .exec();

    const actividades = actividadesMongo.map((act) => {
      const asignadoNombre =
        act.asignados && act.asignados.length > 0
          ? act.asignados[0].usu_nom
          : 'Sin asignar';
      return {
        id: String(act._id),
        nombreActividad: act.nom_actividad,
        nombreProyecto: equipo.proyecto?.proyectoNom || 'Proyecto',
        fechaInicio: act.fecha_inicio || null,
        fechaFin: act.fecha_fin || null,
        estatus: act.estatus || 'Sin Empezar',
        usuarioAsignado: asignadoNombre,
      };
    });

    // Obtener catálogo de roles disponibles (combinado con roles estándar ágiles)
    const dbRoles = await this.prisma.rolEquipo.findMany({ select: { rolEqNom: true } });
    const standardRoles = [
      'Scrum Master',
      'Developer',
      'QA / Tester',
      'Diseñador UI/UX',
      'Product Owner',
      'Analista de Negocios',
    ];
    const allRolesSet = new Set([...standardRoles, ...dbRoles.map((r) => r.rolEqNom)]);
    const rolesDisponibles = Array.from(allRolesSet).sort();

    // Obtener candidatos (Alumnos o Scrum Masters no incluidos en este equipo)
    const miembrosIds = miembros.map((m) => m.usuId);
    const alumnosDb = await this.prisma.usuario.findMany({
      where: {
        rolUsuario: { rolUsuNom: { in: ['Alumno', 'Scrum Master'] } },
        usuId: { notIn: miembrosIds },
      },
      select: {
        usuId: true,
        usuNom: true,
        usuApp: true,
        usuApm: true,
        usuEmail: true,
        grupo: { select: { grupoNom: true } },
      },
      orderBy: { usuNom: 'asc' },
    });
    const candidatos = alumnosDb.map((u) => ({
      usuId: u.usuId,
      nombreCompleto: [u.usuNom, u.usuApp, u.usuApm].filter(Boolean).join(' '),
      correo: u.usuEmail,
      grupo: u.grupo?.grupoNom || 'Sin grupo',
    }));

    return {
      equipo: {
        id: equipo.eqId,
        nombre: equipo.eqNom,
        grupo: equipo.grupo?.grupoNom || 'Sin grupo asignado',
        creador: equipo.scrumMaster
          ? [equipo.scrumMaster.usuNom, equipo.scrumMaster.usuApp]
              .filter(Boolean)
              .join(' ')
          : 'Usuario',
        miembros,
      },
      proyecto: {
        id: equipo.proyecto?.proyectoId || null,
        mongoId: mongoInfo ? String(mongoInfo._id) : null,
        nombre: equipo.proyecto?.proyectoNom || 'Sin proyecto designado',
        descripcion:
          mongoInfo?.descripcion ||
          equipo.proyecto?.proyectoDesc ||
          'Este proyecto aún no cuenta con una descripción detallada.',
        fechaInicio: mongoInfo?.fecha_inicio || equipo.createdAt || null,
        fechaFin: mongoInfo?.fecha_fin || null,
        parciales: mongoInfo?.parciales || [],
        sprints: mongoInfo?.sprints || [],
      },
      actividades,
      rolesDisponibles,
      candidatos,
    };
  }

  private distributeDates(startDate: Date, endDate: Date, count: number) {
    const totalMs = endDate.getTime() - startDate.getTime();
    const msPerPeriod = Math.floor(totalMs / count);
    const periods: { fecha_inicio: Date; fecha_fin: Date }[] = [];
    let currentStart = new Date(startDate.getTime());

    for (let i = 0; i < count; i++) {
      const currentEnd =
        i === count - 1
          ? new Date(endDate.getTime())
          : new Date(currentStart.getTime() + msPerPeriod);

      periods.push({
        fecha_inicio: new Date(currentStart.getTime()),
        fecha_fin: new Date(currentEnd.getTime()),
      });

      currentStart = new Date(currentEnd.getTime());
    }

    return periods;
  }

  private async resolveMongoProyectoByEquipo(equipoId: number) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { eqId: equipoId },
      include: { proyecto: true },
    });
    if (!equipo || !equipo.proyecto) {
      throw new NotFoundException('Equipo o proyecto no encontrado en base relacional.');
    }
    const mongoDoc = await this.proyectoModel.findOne({
      nombre: equipo.proyecto.proyectoNom,
    });
    if (!mongoDoc) {
      throw new NotFoundException('Documento de proyecto no encontrado en MongoDB.');
    }
    return { equipo, mongoDoc };
  }

  async updateProyectoInfo(
    equipoId: number,
    dto: { nombre?: string; descripcion?: string; fechaInicio?: string; fechaFin?: string },
  ) {
    const { equipo, mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);

    // Actualizar Prisma
    if (dto.nombre !== undefined || dto.descripcion !== undefined) {
      await this.prisma.proyecto.update({
        where: { proyectoId: equipo.proyecto!.proyectoId },
        data: {
          ...(dto.nombre && { proyectoNom: dto.nombre }),
          ...(dto.descripcion !== undefined && { proyectoDesc: dto.descripcion }),
        },
      });
    }

    // Actualizar MongoDB
    if (dto.nombre) mongoDoc.nombre = dto.nombre;
    if (dto.descripcion !== undefined) mongoDoc.descripcion = dto.descripcion;
    if (dto.fechaInicio) mongoDoc.fecha_inicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) mongoDoc.fecha_fin = new Date(dto.fechaFin);
    await mongoDoc.save();

    return { message: 'Proyecto actualizado con éxito.' };
  }

  async createSprintsBFF(equipoId: number, cantidad: number) {
    const { mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    if (mongoDoc.sprints && mongoDoc.sprints.length > 0) {
      throw new BadRequestException('El proyecto ya cuenta con Sprints generados.');
    }
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad de Sprints debe ser mayor a 0.');
    }
    const start = mongoDoc.fecha_inicio || new Date();
    const end = mongoDoc.fecha_fin || new Date(Date.now() + 86400000 * 30);
    const periodos = this.distributeDates(start, end, Number(cantidad));

    mongoDoc.sprints = periodos.map((p, idx) => ({
      num_sprint: idx + 1,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      objetivo: `Sprint ${idx + 1}: Objetivo por definir por el equipo.`,
      comentarios: [],
    }));

    await mongoDoc.save();
    return { message: `${cantidad} Sprints creados correctamente.` };
  }

  async updateSprintBFF(
    equipoId: number,
    numSprint: number,
    dto: { fechaInicio?: string; fechaFin?: string; objetivo?: string },
  ) {
    const { mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    const sprint = mongoDoc.sprints?.find((s) => s.num_sprint === Number(numSprint));
    if (!sprint) {
      throw new NotFoundException('El Sprint especificado no existe.');
    }
    if (dto.fechaInicio) sprint.fecha_inicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) sprint.fecha_fin = new Date(dto.fechaFin);
    if (dto.objetivo !== undefined) sprint.objetivo = dto.objetivo;
    await mongoDoc.save();
    return { message: 'Sprint modificado con éxito.' };
  }

  async createParcialesBFF(equipoId: number, cantidad: number) {
    const { mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    if (mongoDoc.parciales && mongoDoc.parciales.length > 0) {
      throw new BadRequestException('El proyecto ya cuenta con Parciales generados.');
    }
    if (cantidad <= 0) {
      throw new BadRequestException('La cantidad de Parciales debe ser mayor a 0.');
    }
    const start = mongoDoc.fecha_inicio || new Date();
    const end = mongoDoc.fecha_fin || new Date(Date.now() + 86400000 * 60);
    const periodos = this.distributeDates(start, end, Number(cantidad));

    mongoDoc.parciales = periodos.map((p, idx) => ({
      num_parcial: idx + 1,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      objetivo: `Parcial ${idx + 1}: Metas de evaluación y entregables.`,
      comentarios: [],
    }));

    await mongoDoc.save();
    return { message: `${cantidad} Parciales creados correctamente.` };
  }

  async updateParcialBFF(
    equipoId: number,
    numParcial: number,
    dto: { fechaInicio?: string; fechaFin?: string; objetivo?: string },
  ) {
    const { mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    const parcial = mongoDoc.parciales?.find((p) => p.num_parcial === Number(numParcial));
    if (!parcial) {
      throw new NotFoundException('El Parcial especificado no existe.');
    }
    if (dto.fechaInicio) parcial.fecha_inicio = new Date(dto.fechaInicio);
    if (dto.fechaFin) parcial.fecha_fin = new Date(dto.fechaFin);
    if (dto.objetivo !== undefined) parcial.objetivo = dto.objetivo;
    await mongoDoc.save();
    return { message: 'Parcial modificado con éxito.' };
  }

  async aprobarParcialBFF(
    equipoId: number,
    numParcial: number,
    dto: { comentarios: string },
    docenteId: number
  ) {
    const { mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    const parcial = mongoDoc.parciales?.find((p) => p.num_parcial === Number(numParcial));
    if (!parcial) {
      throw new NotFoundException('El Parcial especificado no existe.');
    }
    
    parcial.aprobado = true;
    parcial.docenteAprobadorId = docenteId;
    parcial.fechaAprobacion = new Date();
    if (dto.comentarios !== undefined) {
      parcial.comentariosDocente = dto.comentarios;
    }
    
    await mongoDoc.save();
    return { message: 'Parcial aprobado con éxito.' };
  }

  async createActividadBFF(
    equipoId: number,
    dto: {
      nombreActividad: string;
      fechaInicio: string;
      fechaFin: string;
      usuarioAsignadoId: number;
    },
  ) {
    const { equipo, mongoDoc } = await this.resolveMongoProyectoByEquipo(equipoId);
    let asignados: Array<{ usu_id: number; usu_nom: string }> = [];

    if (dto.usuarioAsignadoId) {
      const usuario = await this.prisma.usuario.findUnique({
        where: { usuId: Number(dto.usuarioAsignadoId) },
      });
      if (usuario) {
        const nombreComp = [usuario.usuNom, usuario.usuApp, usuario.usuApm]
          .filter(Boolean)
          .join(' ');
        asignados.push({ usu_id: usuario.usuId, usu_nom: nombreComp });
      }
    }

    const nueva = new this.actividadModel({
      eq_id: equipo.eqId,
      proyecto_id: String(mongoDoc._id),
      nom_actividad: dto.nombreActividad,
      fecha_inicio: dto.fechaInicio ? new Date(dto.fechaInicio) : new Date(),
      fecha_fin: dto.fechaFin ? new Date(dto.fechaFin) : new Date(),
      estatus: EstatusActividad.SIN_EMPEZAR,
      asignados,
    });
    await nueva.save();
    return { message: 'Actividad registrada y asignada con éxito.' };
  }

  private async getOrCreateRolEquipo(rolName: string) {
    const lim = (rolName || 'Developer').trim();
    if (!lim) {
      throw new BadRequestException('El nombre de rol no puede estar vacío.');
    }
    const existentes = await this.prisma.rolEquipo.findMany();
    let rolDoc = existentes.find((r) => r.rolEqNom.toLowerCase() === lim.toLowerCase());
    if (!rolDoc) {
      rolDoc = await this.prisma.rolEquipo.create({
        data: { rolEqNom: lim },
      });
    }
    return rolDoc;
  }

  async addMiembroEquipo(equipoId: number, dto: { usuId: number; rol: string }) {
    if (!dto.usuId) {
      throw new BadRequestException('Debe seleccionar un alumno candidato.');
    }
    const equipo = await this.prisma.equipo.findUnique({
      where: { eqId: Number(equipoId) },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo especificado no existe.');
    }

    const existente = await this.prisma.equipoAlumno.findFirst({
      where: { eqId: Number(equipoId), usuId: Number(dto.usuId) },
    });
    if (existente) {
      throw new BadRequestException('El alumno seleccionado ya forma parte del equipo.');
    }

    const rolDoc = await this.getOrCreateRolEquipo(dto.rol);

    await this.prisma.equipoAlumno.create({
      data: {
        eqId: Number(equipoId),
        usuId: Number(dto.usuId),
        rolEqId: rolDoc.rolEqId,
      },
    });

    return { message: 'Miembro agregado exitosamente al equipo.' };
  }

  async updateRolMiembro(equipoId: number, usuId: number, dto: { rol: string }) {
    const registro = await this.prisma.equipoAlumno.findFirst({
      where: { eqId: Number(equipoId), usuId: Number(usuId) },
    });
    if (!registro) {
      throw new NotFoundException('El miembro no pertenece a este equipo.');
    }

    const rolDoc = await this.getOrCreateRolEquipo(dto.rol);

    await this.prisma.equipoAlumno.update({
      where: { eqAluId: registro.eqAluId },
      data: { rolEqId: rolDoc.rolEqId },
    });

    return { message: 'Rol de integrante actualizado exitosamente.' };
  }

  async removeMiembroEquipo(equipoId: number, usuId: number) {
    const equipo = await this.prisma.equipo.findUnique({
      where: { eqId: Number(equipoId) },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo especificado no existe.');
    }
    if (equipo.scrumMasterId === Number(usuId)) {
      throw new BadRequestException('No es posible dar de baja al líder o creador principal del equipo.');
    }
    const registro = await this.prisma.equipoAlumno.findFirst({
      where: { eqId: Number(equipoId), usuId: Number(usuId) },
    });
    if (!registro) {
      throw new NotFoundException('El usuario especificado no forma parte del equipo.');
    }
    await this.prisma.equipoAlumno.delete({
      where: { eqAluId: registro.eqAluId },
    });
    return { message: 'Miembro eliminado exitosamente del equipo.' };
  }

  async updateActividadEstatus(actividadId: string, estatus: string) {
    if (!estatus || !estatus.trim()) {
      throw new BadRequestException('El estatus de la actividad no puede estar vacío.');
    }
    const actividad = await this.actividadModel.findById(actividadId);
    if (!actividad) {
      throw new NotFoundException('La actividad especificada no existe en la base de datos.');
    }

    // Mapear al enum si es necesario o guardar el estatus oficial
    const statusLim = estatus.trim();
    actividad.estatus = statusLim as any;
    await actividad.save();

    return { message: 'Estatus de la actividad actualizado exitosamente.', estatus: statusLim };
  }
}

