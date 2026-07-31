import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { EstatusHerramienta } from '../../common/providers/enums/estatus-herramienta.enum';

export class CreateHerramientaDto {
  @IsString()
  @IsNotEmpty()
  proyecto_id: string;

  @IsString()
  @IsNotEmpty()
  nombre_herra: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsNotEmpty()
  uso: string;

  @IsString()
  @IsOptional()
  url_herramienta?: string;

  @IsEnum(EstatusHerramienta)
  @IsOptional()
  estatus?: EstatusHerramienta;

  @IsString()
  @IsOptional()
  evaluacion_o_motivo?: string;
}

export class UpdateHerramientaDto {
  @IsString()
  @IsOptional()
  nombre_herra?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  uso?: string;

  @IsString()
  @IsOptional()
  url_herramienta?: string;

  @IsEnum(EstatusHerramienta)
  @IsOptional()
  estatus?: EstatusHerramienta;

  @IsString()
  @IsOptional()
  evaluacion_o_motivo?: string;
}
