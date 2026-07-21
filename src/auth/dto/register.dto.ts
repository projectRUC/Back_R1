import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * DTO para el registro de un nuevo usuario.
 * Las validaciones de class-validator garantizan integridad de datos
 * antes de llegar a la capa de negocio.
 */
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio.' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio.' })
  apellidoPaterno: string;

  @IsString()
  @IsOptional()
  apellidoMaterno?: string;

  @IsEmail({}, { message: 'El correo debe tener un formato válido.' })
  @IsNotEmpty({ message: 'El correo es obligatorio.' })
  correo: string;

  /**
   * Seguridad: mínimo 8 caracteres para dificultar ataques de fuerza bruta.
   * La contraseña se hasheará con bcrypt antes de persistirse.
   */
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  password: string;

  /**
   * ID de RolUsuario (FK). Los valores válidos deben existir en la tabla rol_usuario.
   * Ejemplo: 1=Alumno, 2=Docente, 3=Scrum Master
   */
  @IsInt({ message: 'El rolId debe ser un número entero.' })
  @IsNotEmpty({ message: 'El rolId es obligatorio.' })
  rolId: number;
}
