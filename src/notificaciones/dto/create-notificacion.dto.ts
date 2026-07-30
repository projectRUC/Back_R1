import { IsInt, IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateNotificacionDto {
  @IsInt()
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsString()
  @IsOptional()
  link?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
