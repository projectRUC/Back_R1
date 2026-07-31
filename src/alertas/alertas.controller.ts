import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AlertasService } from './alertas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  /**
   * GET /alertas
   * Retorna todas las alertas del Scrum Master autenticado.
   */
  @Get()
  @Roles('Scrum Master')
  async getMisAlertas(@Request() req) {
    const scrumMasterId = req.user.usuId;
    return this.alertasService.getAlertasByScrumMaster(scrumMasterId);
  }

  /**
   * PATCH /alertas/:id/read
   * Marca una alerta específica como leída.
   */
  @Patch(':id/read')
  @Roles('Scrum Master')
  async marcarLeida(@Param('id') id: string, @Request() req) {
    const scrumMasterId = req.user.usuId;
    return this.alertasService.marcarLeida(id, scrumMasterId);
  }
}
