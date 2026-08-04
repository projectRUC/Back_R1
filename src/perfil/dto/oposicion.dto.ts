import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO para el Derecho de Oposición (LGPDPPSO).
 * Permite al usuario manifestar su negativa u oposición al tratamiento de sus datos.
 */
export class OposicionDto {
  @IsBoolean({ message: 'El campo oposicion debe ser un valor booleano (true/false).' })
  @IsNotEmpty({ message: 'El campo oposicion es obligatorio.' })
  oposicion: boolean;
}
