import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateEquipoDto } from './dto/create-equipo.dto';
import { UpdateEquipoDto } from './dto/update-equipo.dto';
import { EquiposService } from './equipos.service';

/**
 * EquiposController — Controlador de endpoints para Equipos y Proyectos PAEC.
 *
 * Expone las operaciones para que los alumnos y docentes gestionen
 * los equipos de trabajo escolar, vinculando proyectos e integrantes.
 */
@Controller('equipos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EquiposController {
  constructor(private readonly equiposService: EquiposService) {}

  /**
   * POST /equipos
   * Registra un nuevo equipo PAEC, crea su proyecto, lo asocia al grupo
   * e inscribe a sus integrantes con su rol correspondiente (Scrum Master o Developer).
   *
   * @param createEquipoDto DTO validado con nombre, nombreProyecto, grupoId, integrantes y scrumMasterId.
   */
  @Post()
  @Roles('Alumno', 'Docente', 'Scrum Master')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createEquipoDto: CreateEquipoDto) {
    return this.equiposService.create(createEquipoDto);
  }

  /**
   * GET /equipos/:id
   * Retorna los detalles completos de un equipo (Proyecto, Grupo, Scrum Master e Integrantes).
   *
   * @param id ID numérico del equipo (obtenido y convertido mediante ParseIntPipe).
   */
  @Get(':id')
  @Roles('Alumno', 'Docente', 'Scrum Master')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.findOne(id);
  }

  /**
   * PATCH /equipos/:id
   * Actualiza parcialmente la información de un equipo, su proyecto e integrantes.
   *
   * @param id ID numérico del equipo.
   * @param updateEquipoDto DTO con los campos parciales a modificar.
   */
  @Patch(':id')
  @Roles('Alumno', 'Docente', 'Scrum Master')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEquipoDto: UpdateEquipoDto,
  ) {
    return this.equiposService.update(id, updateEquipoDto);
  }

  /**
   * DELETE /equipos/:id
   * Elimina transaccionalmente el equipo y su proyecto asociado en cascada.
   *
   * @param id ID numérico del equipo a eliminar.
   */
  @Delete(':id')
  @Roles('Docente', 'Scrum Master')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.equiposService.remove(id);
  }
}
