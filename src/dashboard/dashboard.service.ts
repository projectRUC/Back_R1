import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../database/prisma.service';
import { Proyecto } from '../database/schemas/proyecto.schema';
import { Actividad } from '../database/schemas/actividad.schema';

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
}
