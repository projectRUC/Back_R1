import { Controller, Get, Req, UseGuards } from '@nestjs/common';
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
}
