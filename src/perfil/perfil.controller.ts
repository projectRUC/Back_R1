import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AllowInactive } from '../common/decorators/allow-inactive.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { PerfilService } from './perfil.service';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { OposicionDto } from './dto/oposicion.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';

/**
 * PerfilController — Cumplimiento LGPDPPSO y Gestión de Derechos ARCO.
 *
 * SEGURIDAD BOLA / IDOR:
 * Todas las operaciones extraen la identidad del usuario exclusivamente
 * desde el token de sesión autenticado (req.user), impidiendo que cualquier
 * parámetro en URL pueda ser manipulado por un atacante.
 */
@Controller('perfil')
@UseGuards(JwtAuthGuard)
export class PerfilController {
  constructor(private readonly perfilService: PerfilService) {}

  /**
   * DERECHO DE ACCESO
   * GET /perfil/mi-cuenta
   * Consulta los datos y relaciones del usuario autenticado.
   */
  @Get('mi-cuenta')
  @HttpCode(HttpStatus.OK)
  async getMiCuenta(@Req() req: Request & { user: JwtPayload }) {
    return this.perfilService.getMiCuenta(req.user.sub);
  }

  /**
   * DERECHO DE RECTIFICACIÓN
   * PATCH /perfil/actualizar
   * Actualiza datos personales y grupo escolar.
   */
  @Patch('actualizar')
  @HttpCode(HttpStatus.OK)
  async updatePerfil(
    @Req() req: Request & { user: JwtPayload },
    @Body() updatePerfilDto: UpdatePerfilDto,
  ) {
    return this.perfilService.updatePerfil(req.user.sub, updatePerfilDto);
  }

  /**
   * CAMBIO DE CONTRASEÑA
   * PATCH /perfil/cambiar-password
   * Valida la contraseña actual y actualiza a una nueva contraseña encriptada con bcrypt.
   */
  @Patch('cambiar-password')
  @HttpCode(HttpStatus.OK)
  async cambiarPassword(
    @Req() req: Request & { user: JwtPayload },
    @Body() cambiarPasswordDto: CambiarPasswordDto,
  ) {
    return this.perfilService.cambiarPassword(req.user.sub, cambiarPasswordDto);
  }

  /**
   * DERECHO DE OPOSICIÓN
   * PATCH /perfil/oposicion
   * Registra u opta por no autorizar el tratamiento de datos.
   */
  @Patch('oposicion')
  @HttpCode(HttpStatus.OK)
  async updateOposicion(
    @Req() req: Request & { user: JwtPayload },
    @Body() oposicionDto: OposicionDto,
  ) {
    return this.perfilService.updateOposicion(req.user.sub, oposicionDto);
  }

  /**
   * DESACTIVACIÓN VOLUNTARIA DE CUENTA
   * PATCH /perfil/desactivar
   * Coloca el estado de la cuenta en INACTIVO.
   */
  @Patch('desactivar')
  @HttpCode(HttpStatus.OK)
  async desactivarCuenta(@Req() req: Request & { user: JwtPayload }) {
    return this.perfilService.desactivarCuenta(req.user.sub);
  }

  /**
   * REACTIVACIÓN DE CUENTA
   * PATCH /perfil/reactivar
   * Permite a un usuario con estado INACTIVO reactivar su cuenta a ACTIVO.
   * Excluido del bloqueo estricto mediante @AllowInactive().
   */
  @Patch('reactivar')
  @AllowInactive()
  @HttpCode(HttpStatus.OK)
  async reactivarCuenta(@Req() req: Request & { user: JwtPayload }) {
    return this.perfilService.reactivarCuenta(req.user.sub);
  }

  /**
   * DERECHO DE CANCELACIÓN / ANONIMIZACIÓN IRREVERSIBLE
   * DELETE /perfil/cancelar
   * Ejecuta borrado lógico criptográfico y anonimización de datos en PostgreSQL.
   */
  @Delete('cancelar')
  @HttpCode(HttpStatus.OK)
  async cancelarCuenta(@Req() req: Request & { user: JwtPayload }) {
    return this.perfilService.cancelarCuenta(req.user.sub);
  }
}
