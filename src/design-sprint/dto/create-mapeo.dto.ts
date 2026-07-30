// dto/create-mapeo.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMapeoDto {
  @IsString() @IsNotEmpty()
  proyecto_problema: string;

  @IsString() @IsNotEmpty()
  proyecto_objective: string;

  @IsString() @IsNotEmpty()
  enfoque: string;

  @IsString() @IsOptional()
  comentario?: string;
}