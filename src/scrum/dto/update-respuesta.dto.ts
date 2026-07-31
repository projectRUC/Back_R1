import { IsOptional, IsString } from 'class-validator';

export class UpdateRespuestaDto {
  @IsString()
  @IsOptional()
  hecho_ayer?: string;

  @IsString()
  @IsOptional()
  por_hacer?: string;

  @IsString()
  @IsOptional()
  inconvenientes?: string;
}
