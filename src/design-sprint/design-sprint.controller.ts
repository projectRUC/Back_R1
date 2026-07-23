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
import { FaseDesignSprint } from './design-sprint.interface';

@Controller('design-sprint')
export class DesignSprintController {
  constructor(private readonly designSprintService: DesignSprintService) {}

  @Post('evidencias')
  registrarAvance(@Body() dto: CreateDesignSprintEvidenceDto) {
    return this.designSprintService.registrarAvance(dto);
  }

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