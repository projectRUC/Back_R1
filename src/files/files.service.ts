import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FileEntity, FileDocument } from './schemas/file.schema';
import { CreateFileDto } from './dto/create-file.dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FilesService {
  constructor(
    @InjectModel(FileEntity.name) private fileModel: Model<FileDocument>,
  ) {}

  async saveFileRecord(file: Express.Multer.File, dto: CreateFileDto) {
    const newFile = new this.fileModel({
      originalName: file.originalname,
      fileName: file.filename,
      path: file.path.replace(/\\/g, '/'), // normaliza rutas en windows
      url: `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname),
      category: dto.category ?? 'general',
      uploadedBy: dto.uploadedBy ?? null,
    });

    return newFile.save();
  }

  async findAll() {
    return this.fileModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const file = await this.fileModel.findById(id).exec();
    if (!file) throw new NotFoundException('Archivo no encontrado');
    return file;
  }

  async getFileForDownload(id: string) {
    const file = await this.findOne(id);

    if (!fs.existsSync(file.path)) {
      throw new NotFoundException('El archivo ya no existe en el servidor');
    }

    return file; // el controller arma el stream de descarga
  }

  async remove(id: string) {
    const file = await this.findOne(id);

    // borra físico del disco también
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    await this.fileModel.findByIdAndDelete(id).exec();
    return { message: 'Archivo eliminado correctamente' };
  }
}