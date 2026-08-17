import { Controller, Post, Body, Get, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { HerramientasService } from './herramientas.service';
import { CreateHerramientaDto, UpdateHerramientaDto } from './dto/herramienta.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('herramientas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Alumno', 'Docente', 'Scrum Master')
export class HerramientasController {
  constructor(private readonly herramientasService: HerramientasService) {}

  @Post()
  createHerramienta(@Body() createHerramientaDto: CreateHerramientaDto) {
    return this.herramientasService.createHerramienta(createHerramientaDto);
  }

  @Get('proyecto/:proyecto_id')
  getHerramientasByProyecto(@Param('proyecto_id') proyecto_id: string) {
    return this.herramientasService.getHerramientasByProyecto(proyecto_id);
  }

  @Get()
  getHerramientas() {
    return this.herramientasService.getHerramientas();
  }

  @Get(':id')
  getHerramientaById(@Param('id') id: string) {
    return this.herramientasService.getHerramientaById(id);
  }

  @Patch(':id')
  updateHerramienta(
    @Param('id') id: string,
    @Body() updateHerramientaDto: UpdateHerramientaDto,
  ) {
    return this.herramientasService.updateHerramienta(id, updateHerramientaDto);
  }

  @Delete(':id')
  deleteHerramienta(@Param('id') id: string) {
    return this.herramientasService.deleteHerramienta(id);
  }
}
