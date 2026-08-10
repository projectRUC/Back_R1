// dto/solicitar-recuperacion.dto.ts
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarRecuperacionDto {
  @IsEmail({}, { message: 'El correo no tiene un formato válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;
}