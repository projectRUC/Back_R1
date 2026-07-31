import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO para el inicio de sesión.
 * Se valida el formato del correo antes de consultar la DB,
 * evitando consultas innecesarias con datos malformados.
 */
export class LoginDto {
  @IsEmail({}, { message: 'El correo debe tener un formato válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  password: string;
}
