// dto/create-puntuacion.dto.ts
import { IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class CreatePuntuacionDto {
  @IsNumber()
  usu_id: number;

  @IsNumber() @Min(1) @Max(5)
  valor: number;

  @IsString() @IsOptional()
  comentario?: string;
}