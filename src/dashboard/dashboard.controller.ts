import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { DashboardService } from './dashboard.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /dashboard/alumno/proyectos-equipos
   * Proyectos y equipos a los que pertenezca el usuario auténtico (Alumno o Scrum Master).
   */
  @Get('alumno/proyectos-equipos')
  @Roles('Alumno', 'Scrum Master', 'Docente')
  async getAlumnoProyectosEquipos(
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.dashboardService.getAlumnoProyectosEquipos(req.user.sub);
  }

  /**
   * GET /dashboard/alumno/actividades
   * Actividades optimizadas del proyecto/equipo del alumno.
   */
  @Get('alumno/actividades')
  @Roles('Alumno', 'Scrum Master', 'Docente')
  async getAlumnoActividades(
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.dashboardService.getAlumnoActividades(req.user.sub);
  }

  /**
   * POST /dashboard/alumno/crear-proyecto-equipo
   * Permite a un Alumno crear simultáneamente un proyecto y un equipo, asignándose como primer miembro.
   */
  @Post('alumno/crear-proyecto-equipo')
  @Roles('Alumno', 'Scrum Master')
  async crearProyectoEquipo(
    @Req() req: Request & { user: JwtPayload },
    @Body()
    body: {
      nombreProyecto: string;
      descripcion?: string;
      fechaInicio: string;
      fechaFin: string;
      nombreEquipo: string;
    },
  ) {
    return this.dashboardService.crearProyectoEquipo(req.user.sub, body);
  }

  /**
   * GET /dashboard/detalle-proyecto-equipo/:equipoId
   * Endpoint BFF para obtener los datos integrados de proyecto (Mongo) y equipo/miembros/actividades (Prisma + Mongo).
   */
  @Get('detalle-proyecto-equipo/:equipoId')
  @Roles('Alumno', 'Scrum Master', 'Docente')
  async getDetalleProyectoEquipo(
    @Param('equipoId', ParseIntPipe) equipoId: number,
  ) {
    return this.dashboardService.getDetalleProyectoEquipo(equipoId);
  }

  /**
   * PATCH /dashboard/detalle-proyecto-equipo/:equipoId/info
   * Edita nombre, descripción y fechas del proyecto sincronizando MongoDB y Prisma.
   */
  @Patch('detalle-proyecto-equipo/:equipoId/info')
  @Roles('Alumno', 'Scrum Master')
  async updateProyectoInfo(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Body()
    body: {
      nombre?: string;
      descripcion?: string;
      fechaInicio?: string;
      fechaFin?: string;
    },
  ) {
    return this.dashboardService.updateProyectoInfo(equipoId, body);
  }

  /**
   * POST /dashboard/detalle-proyecto-equipo/:equipoId/sprints
   * Genera los sprints distribuidos uniformemente en el lapso del proyecto.
   */
  @Post('detalle-proyecto-equipo/:equipoId/sprints')
  @Roles('Alumno', 'Scrum Master')
  async createSprints(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Body('cantidad', ParseIntPipe) cantidad: number,
  ) {
    return this.dashboardService.createSprintsBFF(equipoId, cantidad);
  }

  /**
   * PATCH /dashboard/detalle-proyecto-equipo/:equipoId/sprints/:numSprint
   * Edita objetivo y fechas de un sprint particular.
   */
  @Patch('detalle-proyecto-equipo/:equipoId/sprints/:numSprint')
  @Roles('Alumno', 'Scrum Master')
  async updateSprint(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('numSprint', ParseIntPipe) numSprint: number,
    @Body() body: { fechaInicio?: string; fechaFin?: string; objetivo?: string },
  ) {
    return this.dashboardService.updateSprintBFF(equipoId, numSprint, body);
  }

  /**
   * POST /dashboard/detalle-proyecto-equipo/:equipoId/parciales
   * Genera los parciales distribuidos uniformemente.
   */
  @Post('detalle-proyecto-equipo/:equipoId/parciales')
  @Roles('Alumno', 'Scrum Master')
  async createParciales(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Body('cantidad', ParseIntPipe) cantidad: number,
  ) {
    return this.dashboardService.createParcialesBFF(equipoId, cantidad);
  }

  /**
   * PATCH /dashboard/detalle-proyecto-equipo/:equipoId/parciales/:numParcial
   * Edita objetivo y fechas de un parcial en particular.
   */
  @Patch('detalle-proyecto-equipo/:equipoId/parciales/:numParcial')
  @Roles('Alumno', 'Scrum Master')
  async updateParcial(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('numParcial', ParseIntPipe) numParcial: number,
    @Body() body: { fechaInicio?: string; fechaFin?: string; objetivo?: string },
  ) {
    return this.dashboardService.updateParcialBFF(equipoId, numParcial, body);
  }

  /**
   * PATCH /dashboard/detalle-proyecto-equipo/:equipoId/parciales/:numParcial/aprobar
   * Aprueba la planeación de un parcial. Uso exclusivo del Docente.
   */
  @Patch('detalle-proyecto-equipo/:equipoId/parciales/:numParcial/aprobar')
  @Roles('Docente')
  async aprobarParcial(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('numParcial', ParseIntPipe) numParcial: number,
    @Body() body: { comentarios: string },
    @Req() req: any,
  ) {
    return this.dashboardService.aprobarParcialBFF(equipoId, numParcial, body, req.user.sub);
  }

  /**
   * POST /dashboard/detalle-proyecto-equipo/:equipoId/actividades
   * Crea una actividad vinculada al proyecto y equipo con usuario asignado.
   */
  @Post('detalle-proyecto-equipo/:equipoId/actividades')
  @Roles('Alumno', 'Scrum Master')
  async createActividad(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Body()
    body: {
      nombreActividad: string;
      fechaInicio: string;
      fechaFin: string;
      usuarioAsignadoId: number;
    },
  ) {
    return this.dashboardService.createActividadBFF(equipoId, body);
  }

  /**
   * POST /dashboard/detalle-proyecto-equipo/:equipoId/miembros
   * Agrega un nuevo miembro candidato al equipo con un rol asignado.
   */
  @Post('detalle-proyecto-equipo/:equipoId/miembros')
  @Roles('Alumno', 'Scrum Master')
  async addMiembroEquipo(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Body() body: { usuId: number; rol: string },
  ) {
    return this.dashboardService.addMiembroEquipo(equipoId, body);
  }

  /**
   * PATCH /dashboard/detalle-proyecto-equipo/:equipoId/miembros/:usuId
   * Edita o cambia el rol de un miembro existente en el equipo.
   */
  @Patch('detalle-proyecto-equipo/:equipoId/miembros/:usuId')
  @Roles('Alumno', 'Scrum Master')
  async updateRolMiembro(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('usuId', ParseIntPipe) usuId: number,
    @Body() body: { rol: string },
  ) {
    return this.dashboardService.updateRolMiembro(equipoId, usuId, body);
  }

  /**
   * DELETE /dashboard/detalle-proyecto-equipo/:equipoId/miembros/:usuId
   * Elimina un integrante de la nómina del equipo (protegiendo al creador del proyecto).
   */
  @Delete('detalle-proyecto-equipo/:equipoId/miembros/:usuId')
  @Roles('Alumno', 'Scrum Master')
  async removeMiembroEquipo(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('usuId', ParseIntPipe) usuId: number,
  ) {
    return this.dashboardService.removeMiembroEquipo(equipoId, usuId);
  }

  /**
   * PATCH /dashboard/actividades/:actividadId/estatus
   * Modifica en tiempo real el estatus de una actividad en el tablero Kanban.
   */
  @Patch('actividades/:actividadId/estatus')
  @Roles('Alumno', 'Scrum Master')
  async updateActividadEstatus(
    @Param('actividadId') actividadId: string,
    @Body('estatus') estatus: string,
  ) {
    return this.dashboardService.updateActividadEstatus(actividadId, estatus);
  }

  /**
   * GET /dashboard/docente/proyectos
   * Tarjetas con información básica de todos los proyectos en el sistema.
   */
  @Get('docente/proyectos')
  @Roles('Docente')
  async getDocenteProyectos() {
    return this.dashboardService.getDocenteProyectos();
  }

  /**
   * GET /dashboard/docente/alumnos
   * Tarjetas con los datos resumidos y equipos de todos los alumnos.
   */
  @Get('docente/alumnos')
  @Roles('Docente')
  async getDocenteAlumnos() {
    return this.dashboardService.getDocenteAlumnos();
  }
  /**
   * GET /dashboard/metrics/docente
   * CU-20: Métricas generales del docente
   */
  @Get('metrics/docente')
  @Roles('Docente')
  async getDocenteMetrics(@Req() req: any) {
    const { grupoId, parcial } = req.query;
    return this.dashboardService.getDocenteMetrics(grupoId, parcial);
  }

  /**
   * GET /dashboard/metrics/scrum-master/:equipoId/sprint/:sprint
   * CU-21 & CU-25: Métricas del sprint
   */
  @Get('metrics/scrum-master/:equipoId/sprint/:sprint')
  @Roles('Scrum Master', 'Docente')
  async getScrumMasterMetrics(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('sprint', ParseIntPipe) sprint: number
  ) {
    return this.dashboardService.getScrumMasterMetrics(equipoId, sprint);
  }

  /**
   * GET /dashboard/metrics/personal
   * CU-22: Dashboard personal del integrante
   */
  @Get('metrics/personal')
  @Roles('Alumno', 'Scrum Master')
  async getPersonalMetrics(@Req() req: Request & { user: JwtPayload }) {
    return this.dashboardService.getPersonalMetrics(req.user.sub);
  }

  /**
   * GET /dashboard/proyectos/:equipoId/gantt
   * CU-23: Gantt Chart del proyecto
   */
  @Get('proyectos/:equipoId/gantt')
  @Roles('Docente', 'Scrum Master', 'Alumno')
  async getProyectoGantt(@Param('equipoId', ParseIntPipe) equipoId: number) {
    return this.dashboardService.getProyectoGantt(equipoId);
  }

  /**
   * GET /dashboard/kanban/:equipoId
   * CU-24: Tablero Kanban del Sprint
   */
  @Get('kanban/:equipoId')
  @Roles('Docente', 'Scrum Master', 'Alumno')
  async getKanbanBoard(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Req() req: any
  ) {
    const { sprint } = req.query;
    return this.dashboardService.getKanbanBoard(equipoId, sprint);
  }
}
