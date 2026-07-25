import { IsString, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class CreateProyectoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsDateString()
  @IsNotEmpty()
  fecha_inicio: Date;

  @IsDateString()
  @IsNotEmpty()
  fecha_fin: Date;
}

export class UpdateProyectoDto {
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class CreatePeriodoDto {
  @IsNotEmpty()
  cantidad: number;
}

export class UpdatePeriodoDto {
  @IsDateString()
  @IsOptional()
  fecha_inicio?: Date;

  @IsDateString()
  @IsOptional()
  fecha_fin?: Date;

  @IsString()
  @IsOptional()
  objetivo?: string;
}

export class AddComentarioDto {
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  comentario: string;
}

export class UpdateComentarioDto {
  @IsNotEmpty()
  req_usu_id: number; // To validate permissions

  @IsString()
  @IsNotEmpty()
  comentario: string;
}
