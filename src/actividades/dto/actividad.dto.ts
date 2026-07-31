import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstatusActividad } from '../../common/providers/enums/estatus-actividad.enum';

export class AsignadoDto {
  @IsNumber()
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  usu_nom: string;
}

export class CreateActividadDto {
  @IsNumber()
  @IsNotEmpty()
  eq_id: number;

  @IsString()
  @IsNotEmpty()
  proyecto_id: string;

  @IsString()
  @IsNotEmpty()
  nom_actividad: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criterios_aceptacion?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignadoDto)
  @IsOptional()
  asignados?: AsignadoDto[];

  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;

  @IsNumber()
  @IsOptional()
  estimacion?: number;

  @IsNumber()
  @IsOptional()
  sprint?: number;

  @IsString()
  @IsOptional()
  prioridad?: string;

  @IsNumber()
  @IsOptional()
  parcial?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  archivos?: string[];
}

export class UpdateActividadDto {
  @IsEnum(EstatusActividad)
  @IsOptional()
  estatus?: EstatusActividad;
  
  @IsString()
  @IsOptional()
  nom_actividad?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  criterios_aceptacion?: string[];

  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;

  @IsNumber()
  @IsOptional()
  estimacion?: number;

  @IsNumber()
  @IsOptional()
  sprint?: number;

  @IsNumber()
  @IsOptional()
  parcial?: number;

  @IsString()
  @IsOptional()
  prioridad?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AsignadoDto)
  @IsOptional()
  asignados?: AsignadoDto[];
}

export class AddEvidenciaDto {
  @IsNumber()
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  archivos?: string[];
}

export class UpdateEvidenciaDto {
  @IsNumber()
  @IsNotEmpty()
  req_usu_id: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  archivos?: string[];
}
