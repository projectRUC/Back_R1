import { IsOptional, IsString } from 'class-validator';

export class CreateFileDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;
}