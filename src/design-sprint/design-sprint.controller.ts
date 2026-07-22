import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { DesignSprintService } from './design-sprint.service';
import { CreateDesignSprintEvidenceDto } from './dto/create-design-sprint-evidence.dto';
import { FaseDesignSprint } from 'src/database/schemas/design-sprint-evidence.schema';

@Controller('design-sprint')
export class DesignSprintController {
  constructor(private readonly designSprintService: DesignSprintService) {}

  /**
   * Registra el avance de una fase del Design Sprint para un equipo.
   * POST /design-sprint/evidencias
   */
  @Post('evidencias')
  registrarAvance(@Body() dto: CreateDesignSprintEvidenceDto) {
    return this.designSprintService.registrarAvance(dto);
  }

  /**
   * Consulta el estado de las 4 fases (Mapear, Bocetar, Decidir, Prototipar)
   * para un equipo dentro de un proyecto.
   * GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId
   */
  @Get('equipos/:equipoId/proyectos/:proyectoId')
  consultarAvance(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('proyectoId') proyectoId: string,
  ) {
    return this.designSprintService.consultarAvancePorEquipo(
      equipoId,
      proyectoId,
    );
  }

  /**
   * Consulta el detalle completo (incluyendo evidencias Base64) de una fase.
   * GET /design-sprint/equipos/:equipoId/proyectos/:proyectoId/fases/:fase
   */
  @Get('equipos/:equipoId/proyectos/:proyectoId/fases/:fase')
  consultarFase(
    @Param('equipoId', ParseIntPipe) equipoId: number,
    @Param('proyectoId') proyectoId: string,
    @Param('fase', new ParseEnumPipe(FaseDesignSprint)) fase: FaseDesignSprint,
  ) {
    return this.designSprintService.consultarEvidenciasPorFase(
      equipoId,
      proyectoId,
      fase,
    );
  }
}
