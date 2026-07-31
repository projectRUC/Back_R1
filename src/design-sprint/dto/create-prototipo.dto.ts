// dto/create-prototipo.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreatePrototipoDto {
  @IsString() @IsNotEmpty()
  nombre_prototipo: string;

  @IsString() @IsNotEmpty()
  descripcion: string;

  @IsString() @IsOptional()
  comentario?: string;
}