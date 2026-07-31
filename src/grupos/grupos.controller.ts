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
import { CreateGrupoDto } from './dto/create-grupo.dto';
import { UpdateGrupoDto } from './dto/update-grupo.dto';
import { GruposService } from './grupos.service';

/**
 * GruposController — Controlador de endpoints para los Grupos Escolares.
 */
@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GruposController {
  constructor(private readonly gruposService: GruposService) {}

  /**
   * POST /grupos
   * Registra un nuevo grupo escolar. (Solo Docentes o Admins).
   */
  @Post()
  @Roles('Docente')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createGrupoDto: CreateGrupoDto) {
    return this.gruposService.create(createGrupoDto);
  }

  /**
   * GET /grupos
   * Obtiene la lista de todos los grupos escolares.
   */
  @Get()
  @Roles('Alumno', 'Docente', 'Scrum Master')
  async findAll() {
    return this.gruposService.findAll();
  }

  /**
   * GET /grupos/:id
   * Obtiene el detalle de un grupo escolar por su ID.
   */
  @Get(':id')
  @Roles('Alumno', 'Docente', 'Scrum Master')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.findOne(id);
  }

  /**
   * PATCH /grupos/:id
   * Actualiza el nombre o descripción de un grupo.
   */
  @Patch(':id')
  @Roles('Docente')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateGrupoDto: UpdateGrupoDto,
  ) {
    return this.gruposService.update(id, updateGrupoDto);
  }

  /**
   * DELETE /grupos/:id
   * Elimina un grupo si no tiene relaciones.
   */
  @Delete(':id')
  @Roles('Docente')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.remove(id);
  }
}
