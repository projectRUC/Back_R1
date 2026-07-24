import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateAiDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  systemInstruction?: string;
}
