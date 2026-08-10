// dto/verificar-codigo.dto.ts
import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerificarCodigoDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @Matches(/^\d{6}$/, { message: 'El código debe ser de 6 dígitos.' })
  codigo: string;
}