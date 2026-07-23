import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as fs from 'fs';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { multerConfig } from 'src/config/multer.config';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileDto,
  ) {
    return this.filesService.saveFileRecord(file, dto);
  }

  @Get()
  async findAll() {
    return this.filesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.getFileForDownload(id);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"`,
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');

    const stream = fs.createReadStream(file.path);
    stream.pipe(res);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.filesService.remove(id);
  }
}