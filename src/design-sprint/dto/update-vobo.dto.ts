import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateVoBoDto {
  @IsString()
  @IsOptional()
  nombre_experto?: string;

  @IsString()
  @IsOptional()
  profesion_institucion?: string;

  @IsString()
  @IsOptional()
  comentarios_viabilidad?: string;

  @IsString()
  @IsOptional()
  dictamen?: string;

  @IsBoolean()
  @IsOptional()
  vobo_docente?: boolean;
}
