import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

export const multerConfig = {
  storage: diskStorage({
    destination: './uploads', // carpeta física donde se guardan
    filename: (req, file, callback) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = extname(file.originalname);
      const fileName = `${uniqueSuffix}${ext}`;
      callback(null, fileName);
    },
  }),
  fileFilter: (req, file, callback) => {
    // ajusta según lo que quieras permitir
    const allowed = /jpg|jpeg|png|gif|pdf|docx|xlsx|webp/;
    const ok = allowed.test(extname(file.originalname).toLowerCase());
    if (!ok) {
      return callback(
        new BadRequestException('Tipo de archivo no permitido'),
        false,
      );
    }
    callback(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB, ajústalo
  },
};
