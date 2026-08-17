import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Alumno', 'Docente', 'Scrum Master')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post()
  crearNotificacion(@Body() createDto: CreateNotificacionDto) {
    return this.notificacionesService.crearNotificacion(createDto);
  }

  @Get('usuario/:usuId')
  obtenerPorUsuario(
    @Param('usuId', ParseIntPipe) usuId: number,
    @Req() req: any,
  ) {
    if (req.user?.rol !== 'Docente' && req.user?.sub !== usuId) {
      throw new ForbiddenException('No autorizado para acceder a las notificaciones de otro usuario.');
    }
    return this.notificacionesService.obtenerPorUsuario(usuId);
  }

  @Put(':id/leer')
  marcarComoLeida(@Param('id') notificacionId: string) {
    return this.notificacionesService.marcarComoLeida(notificacionId);
  }

  @Put('usuario/:usuId/leer-todas')
  marcarTodasComoLeidas(
    @Param('usuId', ParseIntPipe) usuId: number,
    @Req() req: any,
  ) {
    if (req.user?.rol !== 'Docente' && req.user?.sub !== usuId) {
      throw new ForbiddenException('No autorizado para modificar las notificaciones de otro usuario.');
    }
    return this.notificacionesService.marcarTodasComoLeidas(usuId);
  }

  @Delete(':id')
  eliminarNotificacion(@Param('id') notificacionId: string) {
    return this.notificacionesService.eliminarNotificacion(notificacionId);
  }
}
