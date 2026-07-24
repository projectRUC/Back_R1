import { Type } from 'class-transformer';
import {

  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FaseDesignSprint } from '../design-sprint.interface';

export class ComentarioDto {
  @IsNumber()
  usu_id: number;

  @IsString()
  texto: string;
}

export class CreateSprintDto {
  @IsNumber()
  eq_id: number;

  @IsMongoId()
  proyecto_id: string;
}

export class MapeoDto {
  @IsString()
  proyecto_problema: string;

  @IsString()
  proyecto_objective: string;

  @IsString()
  enfoque: string;

  @IsOptional()
  @IsArray()
  archivos?: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComentarioDto)
  comentarios?: ComentarioDto[];
}

export class BocetoDto {
  @IsString()
  propuesta: string;

  @IsNumber()
  usu_id: number;

  @IsOptional()
  @IsArray()
  archivos?: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComentarioDto)
  comentarios?: ComentarioDto[];
}

export class RegistrarDecisionDto {
  @IsNumber()
  usu_id: number;

  @IsNumber()
  valor: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ComentarioDto)
  comentario?: ComentarioDto;

  // Si viene en true, este boceto se marca como GANADOR
  // y el sprint pasa a la fase PROTOTIPAR.
  @IsOptional()
  @IsBoolean()
  marcarGanador?: boolean;
}

export class PrototipoDto {
  @IsString()
  nombre_prototipo: string;

  @IsString()
  descripcion: string;

  @IsOptional()
  @IsArray()
  archivos?: any[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComentarioDto)
  comentarios?: ComentarioDto[];
}

export class CreateDesignSprintEvidenceDto {
  @IsNumber()
  equipoId: number;

  @IsMongoId()
  proyectoId: string;

  @IsEnum(FaseDesignSprint)
  fase: FaseDesignSprint;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  archivosUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentarios?: string;
}