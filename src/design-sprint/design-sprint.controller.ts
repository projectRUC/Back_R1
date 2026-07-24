import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { DesignSprintService } from './design-sprint.service';

import {
  FaseDesignSprint,
  IAvanceDesignSprint,
  IDesignSprintEvidence,
} from './design-sprint.interface';
import { CreateDesignSprintEvidenceDto } from './dto/design-sprint.dto';

@Controller('design-sprint')
export class DesignSprintController {
  constructor(private readonly designSprintService: DesignSprintService) {}

  /**
   * Registra el avance de una fase del Design Sprint.
   * Valida que la fase anterior ya haya sido registrada y que no exista
   * un duplicado para el mismo equipo/proyecto/fase.
   *
   * POST /design-sprint/evidencias
   */
  @Post('evidencias')
  async registrarEvidencia(
    @Body() dto: CreateDesignSprintEvidenceDto,
  ): Promise<IDesignSprintEvidence> {
    return this.designSprintService.registrarEvidencia(dto);
  }

  /**
   * Devuelve el avance completo (las 4 fases, en orden) de un equipo
   * dentro de un proyecto. Cada fase indica si ya fue iniciada,
   * su fecha, comentarios y cantidad de archivos.
   *
   * GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId
   */
  @Get('equipos/:equipoId/proyectos/:proyectoId')
  async obtenerAvance(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('proyectoId') proyectoId: string,
  ): Promise<IAvanceDesignSprint> {
    return this.designSprintService.obtenerAvance(equipoId, proyectoId);
  }

  /**
   * Devuelve el detalle completo de UNA fase específica
   * (archivos, comentarios, fecha de registro).
   *
   * GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId/fases/:fase
   */
  @Get('equipos/:equipoId/proyectos/:proyectoId/fases/:fase')
  async obtenerFase(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('proyectoId') proyectoId: string,
    @Param('fase') fase: FaseDesignSprint,
  ): Promise<IDesignSprintEvidence> {
    return this.designSprintService.obtenerFase(equipoId, proyectoId, fase);
  }
}