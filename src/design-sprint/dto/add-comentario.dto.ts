import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class AddComentarioDto {
  @IsNumber()
  @IsNotEmpty()
  usu_id: number;

  @IsString()
  @IsNotEmpty()
  texto: string;
}