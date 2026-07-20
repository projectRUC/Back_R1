import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { FaseDesignSprint } from 'src/database/schemas/design-sprint-evidence.schema';


export class CreateDesignSprintEvidenceDto {
  @IsNumber()
  equipoId: number;

  @IsMongoId()
  proyectoId: string;

  @IsEnum(FaseDesignSprint, {
    message: 'fase debe ser una de: mapear, bocetar, decidir, prototipar',
  })
  fase: FaseDesignSprint;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Máximo 5 evidencias por registro de fase' })
  @IsString({ each: true })
  contenidoBase64?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentarios?: string;
}