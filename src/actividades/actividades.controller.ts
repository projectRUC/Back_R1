import { Controller, Post, Body, Put, Param, Patch, Delete, Get } from '@nestjs/common';
import { ActividadesService } from './actividades.service';
import { CreateActividadDto, UpdateActividadDto, AddEvidenciaDto, UpdateEvidenciaDto } from './dto/actividad.dto';
import { AddComentarioDto, UpdateComentarioDto } from '../proyectos/dto/proyecto.dto';

@Controller('actividades')
export class ActividadesController {
  constructor(private readonly actividadesService: ActividadesService) {}

  @Post()
  createActividad(@Body() createActividadDto: CreateActividadDto) {
    return this.actividadesService.createActividad(createActividadDto);
  }

  @Get('proyecto/:proyecto_id')
  getActividadesByProyecto(@Param('proyecto_id') proyecto_id: string) {
    return this.actividadesService.getActividadesByProyecto(proyecto_id);
  }

  @Patch(':id')
  updateActividad(
    @Param('id') id: string,
    @Body() updateActividadDto: UpdateActividadDto
  ) {
    return this.actividadesService.updateActividad(id, updateActividadDto);
  }

  @Post(':id/comentarios')
  addComentario(
    @Param('id') id: string,
    @Body() addComentarioDto: AddComentarioDto
  ) {
    return this.actividadesService.addComentario(id, addComentarioDto);
  }

  @Patch(':id/comentarios/:comment_id')
  updateComentario(
    @Param('id') id: string,
    @Param('comment_id') comment_id: string,
    @Body() updateComentarioDto: UpdateComentarioDto
  ) {
    return this.actividadesService.updateComentario(id, comment_id, updateComentarioDto);
  }

  @Post(':id/evidencias')
  addEvidencia(
    @Param('id') id: string,
    @Body() addEvidenciaDto: AddEvidenciaDto
  ) {
    return this.actividadesService.addEvidencia(id, addEvidenciaDto);
  }

  @Patch(':id/evidencias/:evidencia_id')
  updateEvidencia(
    @Param('id') id: string,
    @Param('evidencia_id') evidencia_id: string,
    @Body() updateEvidenciaDto: UpdateEvidenciaDto
  ) {
    return this.actividadesService.updateEvidencia(id, evidencia_id, updateEvidenciaDto);
  }
}
