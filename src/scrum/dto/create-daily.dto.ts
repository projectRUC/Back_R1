import { IsInt, IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class CreateDailyDto {
  @IsInt()
  @IsNotEmpty()
  eq_id: number;

  @IsMongoId()
  @IsNotEmpty()
  proyecto_id: string;

  @IsInt()
  @IsNotEmpty()
  sprint: number;

  @IsInt()
  @IsNotEmpty()
  parcial: number;

  @IsInt()
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  hecho_ayer: string;

  @IsString()
  @IsNotEmpty()
  por_hacer: string;

  @IsString()
  @IsNotEmpty()
  inconvenientes: string;
}
