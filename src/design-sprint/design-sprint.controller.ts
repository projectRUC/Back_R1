// design-sprint.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFiles,
  UseInterceptors,
  Query,
  Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DesignSprintService } from './design-sprint.service';
import { CreateMapeoDto } from './dto/create-mapeo.dto';
import { CreateBocetoDto } from './dto/create-boceto.dto';
import { CreatePuntuacionDto } from './dto/create-puntuacion.dto';
import { CreatePrototipoDto } from './dto/create-prototipo.dto';

const multerConfig = {
  storage: diskStorage({
    destination: './uploads',
    filename: (_req, file, cb) => {
      const nombreUnico = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
      cb(null, nombreUnico);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB por archivo
};

@Controller('design-sprint')
export class DesignSprintController {
  constructor(private readonly designSprintService: DesignSprintService) {}

  @Post()
  crear(@Body('eq_id') eq_id: number, @Body('proyecto_id') proyecto_id: string) {
    return this.designSprintService.crear(Number(eq_id), proyecto_id);
  }

  // 1. PRIMERO: Captura las consultas generales con Query Params (?eq_id=...&proyecto_id=...)
  @Get()
  findByEquipoProyecto(
    @Query('eq_id') eq_id: string,
    @Query('proyecto_id') proyecto_id: string,
  ) {
    return this.designSprintService.findByEquipoYProyecto(Number(eq_id), proyecto_id);
  }

  // 2. DESPUÉS: Captura peticiones directas por ID (/design-sprint/123)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.designSprintService.findById(id);
  }

  // Lunes — Mapear
  @Post(':id/mapeo')
  @UseInterceptors(FilesInterceptor('archivos', 5, multerConfig))
  registrarMapeo(
    @Param('id') id: string,
    @Body() dto: CreateMapeoDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.designSprintService.registrarMapeo(id, dto, files, req.user?.id);
  }

  // Martes — Bocetar
  @Post(':id/boceto')
  @UseInterceptors(FilesInterceptor('archivos', 5, multerConfig))
  registrarBoceto(
    @Param('id') id: string,
    @Body() dto: CreateBocetoDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.designSprintService.registrarBoceto(id, dto, files, req.user?.id);
  }

// Miércoles — Decidir (votar un boceto)
@Post(':id/boceto/:bocetoId/puntuacion')
puntuarBoceto(
  @Param('id') id: string,
  @Param('bocetoId') bocetoId: string,
  @Body() dto: CreatePuntuacionDto,
) {
  return this.designSprintService.puntuarBoceto(id, bocetoId, {
    ...dto,
    usu_id: Number(dto.usu_id),
    valor: Number(dto.valor ?? 1),
  });
}
  // Jueves — Prototipar
  @Post(':id/prototipo')
  @UseInterceptors(FilesInterceptor('archivos', 5, multerConfig))
  registrarPrototipo(
    @Param('id') id: string,
    @Body() dto: CreatePrototipoDto,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    return this.designSprintService.registrarPrototipo(id, dto, files, req.user?.id);
  }
}