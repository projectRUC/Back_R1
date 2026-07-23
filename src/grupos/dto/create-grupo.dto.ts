import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateGrupoDto {
  /**
   * Nombre único del grupo escolar.
   * @example "9ID1"
   */
  @IsString({ message: 'El nombre del grupo debe ser texto.' })
  @IsNotEmpty({ message: 'El nombre del grupo es obligatorio.' })
  @MaxLength(50, { message: 'El nombre del grupo no puede exceder 50 caracteres.' })
  grupoNom: string;

  /**
   * Descripción opcional del grupo.
   * @example "Grupo de noveno cuatrimestre de Ingeniería en Desarrollo"
   */
  @IsString({ message: 'La descripción del grupo debe ser texto.' })
  @IsOptional()
  @MaxLength(255, { message: 'La descripción no puede exceder 255 caracteres.' })
  grupoDesc?: string;
}
