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
import { FaseDesignSprint } from '../design-sprint.interface';

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
  @ArrayMaxSize(5, { message: 'Máximo 5 archivos por registro de fase' })
  @IsString({ each: true })
  archivosUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comentarios?: string;
}