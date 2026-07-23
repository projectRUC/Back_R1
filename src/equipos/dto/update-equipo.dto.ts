import { PartialType } from '@nestjs/mapped-types';
import { CreateEquipoDto } from './create-equipo.dto';

/**
 * UpdateEquipoDto — DTO para la actualización parcial de un equipo PAEC.
 *
 * Hereda todas las validaciones de CreateEquipoDto convirtiendo cada campo
 * en opcional (permite modificar solo los campos que se envíen en la petición).
 */
export class UpdateEquipoDto extends PartialType(CreateEquipoDto) {}
