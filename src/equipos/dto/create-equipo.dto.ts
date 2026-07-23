import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * CreateEquipoDto — DTO para el registro transaccional de un equipo PAEC y su proyecto.
 *
 * Valida de forma estricta los campos requeridos para dar de alta el equipo,
 * asociarlo a un grupo escolar, crear el proyecto vinculado, e inscribir a los
 * integrantes asignando al Scrum Master.
 */
export class CreateEquipoDto {
  /**
   * Nombre del equipo de trabajo.
   * @example "Equipo Alpha"
   */
  @IsString({ message: 'El nombre del equipo debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del equipo es obligatorio.' })
  nombre: string;

  /**
   * Nombre del proyecto PAEC o actividad ágil que desarrollará el equipo.
   * @example "Sistema de Gestión de Proyectos Escolares PAEC"
   */
  @IsString({ message: 'El nombre del proyecto debe ser una cadena de texto.' })
  @IsNotEmpty({ message: 'El nombre del proyecto es obligatorio.' })
  nombreProyecto: string;

  /**
   * ID del grupo escolar al que pertenece el equipo (FK hacia la tabla Grupo).
   * Nota: En nuestra base de datos relacional (Prisma + PostgreSQL) las llaves primarias
   * son enteros autoincrementables (Int), por ello se valida con @IsInt() y @Type(() => Number).
   * @example 1
   */
  @Type(() => Number)
  @IsInt({ message: 'El ID del grupo debe ser un número entero.' })
  @IsNotEmpty({ message: 'El ID del grupo es obligatorio.' })
  grupoId: number;

  /**
   * Arreglo con los IDs enteros de los usuarios (Alumnos) que integran el equipo.
   * Se relacionarán en la tabla intermedia EquipoAlumno.
   * @example [1, 2, 3, 4]
   */
  @IsArray({ message: 'Los integrantes deben ser proporcionados en un arreglo.' })
  @ArrayNotEmpty({ message: 'El equipo debe tener al menos un integrante.' })
  @Type(() => Number)
  @IsInt({ each: true, message: 'Cada integrante debe ser un ID numérico entero.' })
  integrantes: number[];

  /**
   * ID entero del usuario/alumno designado explícitamente como Scrum Master del equipo.
   * Debe estar idealmente dentro de la lista de integrantes o corresponder a un Alumno existente.
   * @example 1
   */
  @Type(() => Number)
  @IsInt({ message: 'El ID del Scrum Master debe ser un número entero.' })
  @IsNotEmpty({ message: 'El ID del Scrum Master es obligatorio.' })
  scrumMasterId: number;
}
