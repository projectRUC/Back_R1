import { Controller, Post, Body, Put, Param, Patch, Delete } from '@nestjs/common';
import { ProyectosService } from './proyectos.service';
import { CreateProyectoDto, UpdateProyectoDto, CreatePeriodoDto, UpdatePeriodoDto, AddComentarioDto, UpdateComentarioDto } from './dto/proyecto.dto';

@Controller('proyectos')
export class ProyectosController {
  constructor(private readonly proyectosService: ProyectosService) {}

  @Post()
  createProyecto(@Body() createProyectoDto: CreateProyectoDto) {
    return this.proyectosService.createProyecto(createProyectoDto);
  }

  @Put(':id')
  updateProyecto(@Param('id') id: string, @Body() updateProyectoDto: UpdateProyectoDto) {
    return this.proyectosService.updateProyecto(id, updateProyectoDto);
  }

  // Parciales
  @Post(':id/parciales')
  createParciales(@Param('id') id: string, @Body() createPeriodoDto: CreatePeriodoDto) {
    return this.proyectosService.createParciales(id, createPeriodoDto);
  }

  @Patch(':id/parciales/:num_parcial')
  updateParcial(
    @Param('id') id: string,
    @Param('num_parcial') num_parcial: string,
    @Body() updatePeriodoDto: UpdatePeriodoDto
  ) {
    return this.proyectosService.updateParcial(id, parseInt(num_parcial, 10), updatePeriodoDto);
  }

  @Delete(':id/parciales/:num_parcial')
  deleteParcial(
    @Param('id') id: string,
    @Param('num_parcial') num_parcial: string
  ) {
    return this.proyectosService.deleteParcial(id, parseInt(num_parcial, 10));
  }

  @Post(':id/parciales/:num_parcial/comentarios')
  addComentarioParcial(
    @Param('id') id: string,
    @Param('num_parcial') num_parcial: string,
    @Body() addComentarioDto: AddComentarioDto
  ) {
    return this.proyectosService.addComentarioParcial(id, parseInt(num_parcial, 10), addComentarioDto);
  }

  @Patch(':id/parciales/:num_parcial/comentarios/:comment_id')
  editComentarioParcial(
    @Param('id') id: string,
    @Param('num_parcial') num_parcial: string,
    @Param('comment_id') comment_id: string,
    @Body() updateComentarioDto: UpdateComentarioDto
  ) {
    return this.proyectosService.editComentarioParcial(id, parseInt(num_parcial, 10), comment_id, updateComentarioDto);
  }

  // Sprints
  @Post(':id/sprints')
  createSprints(@Param('id') id: string, @Body() createPeriodoDto: CreatePeriodoDto) {
    return this.proyectosService.createSprints(id, createPeriodoDto);
  }

  @Patch(':id/sprints/:num_sprint')
  updateSprint(
    @Param('id') id: string,
    @Param('num_sprint') num_sprint: string,
    @Body() updatePeriodoDto: UpdatePeriodoDto
  ) {
    return this.proyectosService.updateSprint(id, parseInt(num_sprint, 10), updatePeriodoDto);
  }

  @Delete(':id/sprints/:num_sprint')
  deleteSprint(
    @Param('id') id: string,
    @Param('num_sprint') num_sprint: string
  ) {
    return this.proyectosService.deleteSprint(id, parseInt(num_sprint, 10));
  }

  @Post(':id/sprints/:num_sprint/comentarios')
  addComentarioSprint(
    @Param('id') id: string,
    @Param('num_sprint') num_sprint: string,
    @Body() addComentarioDto: AddComentarioDto
  ) {
    return this.proyectosService.addComentarioSprint(id, parseInt(num_sprint, 10), addComentarioDto);
  }

  @Patch(':id/sprints/:num_sprint/comentarios/:comment_id')
  editComentarioSprint(
    @Param('id') id: string,
    @Param('num_sprint') num_sprint: string,
    @Param('comment_id') comment_id: string,
    @Body() updateComentarioDto: UpdateComentarioDto
  ) {
    return this.proyectosService.editComentarioSprint(id, parseInt(num_sprint, 10), comment_id, updateComentarioDto);
  }
}
