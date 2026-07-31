import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post()
  crearNotificacion(@Body() createDto: CreateNotificacionDto) {
    return this.notificacionesService.crearNotificacion(createDto);
  }

  @Get('usuario/:usuId')
  obtenerPorUsuario(@Param('usuId', ParseIntPipe) usuId: number) {
    return this.notificacionesService.obtenerPorUsuario(usuId);
  }

  @Put(':id/leer')
  marcarComoLeida(@Param('id') notificacionId: string) {
    return this.notificacionesService.marcarComoLeida(notificacionId);
  }

  @Put('usuario/:usuId/leer-todas')
  marcarTodasComoLeidas(@Param('usuId', ParseIntPipe) usuId: number) {
    return this.notificacionesService.marcarTodasComoLeidas(usuId);
  }

  @Delete(':id')
  eliminarNotificacion(@Param('id') notificacionId: string) {
    return this.notificacionesService.eliminarNotificacion(notificacionId);
  }
}
