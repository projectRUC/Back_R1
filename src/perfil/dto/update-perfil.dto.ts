import { IsInt, IsOptional, IsString } from 'class-validator';

/**
 * DTO para el Derecho de Rectificación (LGPDPPSO).
 * Permite actualizar datos personales o grupo escolar.
 */
export class UpdatePerfilDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto.' })
  @IsOptional()
  nombre?: string;

  @IsString({ message: 'El apellido paterno debe ser una cadena de texto.' })
  @IsOptional()
  apellidoPaterno?: string;

  @IsString({ message: 'El apellido materno debe ser una cadena de texto.' })
  @IsOptional()
  apellidoMaterno?: string;

  @IsInt({ message: 'El grupoId debe ser un número entero.' })
  @IsOptional()
  grupoId?: number;
}
