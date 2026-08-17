import { Controller, Post, Body, Get, Param, ParseIntPipe, Put, Delete, UseGuards } from '@nestjs/common';
import { ScrumService } from './scrum.service';
import { CreateDailyDto } from './dto/create-daily.dto';
import { UpdateRespuestaDto } from './dto/update-respuesta.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('scrum')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Alumno', 'Docente', 'Scrum Master')
export class ScrumController {
  constructor(private readonly scrumService: ScrumService) {}

  // Crear o añadir respuesta a un Daily
  @Post('daily')
  createDaily(@Body() createDailyDto: CreateDailyDto) {
    return this.scrumService.createDaily(createDailyDto);
  }

  // Obtener todos los dailies de un equipo
  @Get('daily/equipo/:equipoId')
  getDailiesByEquipo(@Param('equipoId', ParseIntPipe) equipoId: number) {
    return this.scrumService.getDailiesByEquipo(equipoId);
  }

  // Obtener un daily por ID de documento
  @Get('daily/:dailyId')
  getDailyById(@Param('dailyId') dailyId: string) {
    return this.scrumService.getDailyById(dailyId);
  }

  // Actualizar la respuesta de un usuario específico en un daily
  @Put('daily/:dailyId/respuesta/:usuId')
  updateRespuesta(
    @Param('dailyId') dailyId: string,
    @Param('usuId', ParseIntPipe) usuId: number,
    @Body() updateDto: UpdateRespuestaDto,
  ) {
    return this.scrumService.updateRespuesta(dailyId, usuId, updateDto);
  }

  // Eliminar la respuesta de un usuario específico en un daily
  @Delete('daily/:dailyId/respuesta/:usuId')
  deleteRespuesta(
    @Param('dailyId') dailyId: string,
    @Param('usuId', ParseIntPipe) usuId: number,
  ) {
    return this.scrumService.deleteRespuesta(dailyId, usuId);
  }

  // Eliminar el documento daily completo
  @Delete('daily/:dailyId')
  deleteDaily(@Param('dailyId') dailyId: string) {
    return this.scrumService.deleteDaily(dailyId);
  }
}
