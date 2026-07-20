import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FileDocument = FileEntity & Document;

@Schema({ timestamps: true })
export class FileEntity {
  @Prop({ required: true })
  originalName: string; // nombre original que subió el usuario

  @Prop({ required: true })
  fileName: string; // nombre generado/guardado en disco (evita colisiones)

  @Prop({ required: true })
  path: string; // ruta física en el servidor, ej: uploads/1721490000-foto.png

  @Prop({ required: true })
  url: string; // ruta pública que consume el front, ej: /uploads/1721490000-foto.png

  @Prop()
  mimeType: string;

  @Prop()
  size: number; // en bytes

  @Prop()
  extension: string;

  @Prop({ type: String, default: null })
  uploadedBy: string; // opcional: userId si luego lo integras con auth

  @Prop({ default: 'general' })
  category: string; // opcional: para agrupar (avatars, documentos, etc)
}

export const FileSchema = SchemaFactory.createForClass(FileEntity);