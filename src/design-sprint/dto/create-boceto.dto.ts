// dto/create-boceto.dto.ts
import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateBocetoDto {
  @IsString() @IsNotEmpty()
  propuesta: string;

  @Type(() => Number) // 👈 Converts string "12" to number 12 before validation
  @IsInt()
  usu_id: number;

  @IsString() @IsOptional()
  status?: string;

  @IsString() @IsOptional()
  comentario?: string;
}