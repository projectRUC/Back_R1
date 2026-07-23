import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const fileName = `${uniqueSuffix}${ext}`;
      callback(null, fileName);
    },
  }),
  fileFilter: (req, file, callback) => {
    // Extensiones permitidas - imágenes, videos, documentos, audio, comprimidos
    const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|mp4|webm|mov|avi|mkv|wmv|flv|mp3|wav|ogg|aac|flac|zip|rar|7z|gz|tar)$/i;
    const ext = extname(file.originalname).toLowerCase();
    
    if (!allowedExtensions.test(ext)) {
      return callback(
        new BadRequestException(`Tipo de archivo no permitido: ${ext}`),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};