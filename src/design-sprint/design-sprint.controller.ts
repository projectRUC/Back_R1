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
  NotFoundException,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DesignSprintService } from './design-sprint.service';
import { CreateMapeoDto } from './dto/create-mapeo.dto';
import { CreateBocetoDto } from './dto/create-boceto.dto';
import { CreatePuntuacionDto } from './dto/create-puntuacion.dto';
import { CreatePrototipoDto } from './dto/create-prototipo.dto';
import { AddComentarioDto } from './dto/add-comentario.dto';
import { PitchCoachResponseDto } from './dto/pitch-coach-response.dto';
import { UpdateVoBoDto } from './dto/update-vobo.dto';
import { AiService } from 'src/ai/ai.service';

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
  constructor(
    private readonly designSprintService: DesignSprintService,
    private readonly aiService: AiService,
  ) {}

  @Post()
  crear(@Body('eq_id') eq_id: number, @Body('proyecto_id') proyecto_id: string) {
    if (!eq_id || !proyecto_id) {
      throw new BadRequestException('Se requieren eq_id y proyecto_id para crear el ciclo de ideación.');
    }
    return this.designSprintService.crear(Number(eq_id), proyecto_id);
  }

  @Get()
  findByEquipoProyecto(
    @Query('eq_id') eq_id: string,
    @Query('proyecto_id') proyecto_id: string,
  ) {
    if (!eq_id || !proyecto_id) {
      throw new BadRequestException('Se requieren los parámetros eq_id y proyecto_id.');
    }
    return this.designSprintService.findByEquipoYProyecto(Number(eq_id), proyecto_id);
  }

  // Devuelve el documento DESCIFRADO (findById devuelve el crudo, es solo para uso interno)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.designSprintService.findByIdDecrypted(id);
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

  // ---------- RETROALIMENTACIÓN DOCENTE ----------

  @Post([':id/mapeo/comentarios', ':id/mapeo/comentario'])
  agregarComentarioMapeo(@Param('id') id: string, @Body() dto: AddComentarioDto) {
    return this.designSprintService.agregarComentarioMapeo(id, dto);
  }

  @Post([
    ':id/bocetos/:bocetoId/comentarios',
    ':id/bocetos/:bocetoId/comentario',
    ':id/boceto/:bocetoId/comentarios',
    ':id/boceto/:bocetoId/comentario',
  ])
  agregarComentarioBoceto(
    @Param('id') id: string,
    @Param('bocetoId') bocetoId: string,
    @Body() dto: AddComentarioDto,
  ) {
    return this.designSprintService.agregarComentarioBoceto(id, bocetoId, dto);
  }

  @Post([':id/prototipo/comentarios', ':id/prototipo/comentario'])
  agregarComentarioPrototipo(@Param('id') id: string, @Body() dto: AddComentarioDto) {
    return this.designSprintService.agregarComentarioPrototipo(id, dto);
  }

  @Post([':id/comentarios-generales', ':id/comentario-general'])
  agregarComentarioGeneral(@Param('id') id: string, @Body() dto: AddComentarioDto) {
    return this.designSprintService.agregarComentarioGeneral(id, dto);
  }

  // ---------- VALIDACIÓN Y VOBO (Viernes) ----------
  @Patch(':id/vobo')
  actualizarVoBo(@Param('id') id: string, @Body() dto: UpdateVoBoDto) {
    return this.designSprintService.actualizarVoBo(id, dto);
  }

  // ---------- IA PITCH COACH ----------

  @Post(':id/ai-pitch-coach')
  async runPitchCoach(@Param('id') id: string): Promise<PitchCoachResponseDto> {
    // IMPORTANTE: se usa la versión descifrada, si no la IA recibiría texto cifrado ilegible
    const project = await this.designSprintService.findByIdDecrypted(id);

    if (!project) {
      throw new NotFoundException(`El Design Sprint con ID ${id} no existe.`);
    }

    const doc = project as any;

    const resumen =
      doc.mapeo?.meta_a_largo_plazo ||
      doc.prototipo?.descripcion ||
      doc.mapeo?.proyecto_problema ||
      doc.resumen ||
      doc.descripcion ||
      'Proyecto enfocado en la solución de problemas mediante un producto/servicio innovador.';

    const rawProblematicas =
      doc.mapeo?.preguntas_como_podriamos || doc.problematicas || doc.retos;

    const problematicas =
      Array.isArray(rawProblematicas) && rawProblematicas.length > 0
        ? rawProblematicas
        : ['Falta de validación clara de la propuesta de valor con clientes potenciales'];

    const evidencias: string[] = [];

    if (doc.prototipo?.enlace) evidencias.push(`Enlace al prototipo: ${doc.prototipo.enlace}`);
    if (doc.prototipo?.archivos?.length)
      evidencias.push(`Archivos de prototipo subidos: ${doc.prototipo.archivos.length}`);
    if (doc.bocetos?.length)
      evidencias.push(`Cantidad de bocetos registrados: ${doc.bocetos.length}`);
    if (Array.isArray(doc.evidencias) && doc.evidencias.length) evidencias.push(...doc.evidencias);

    if (evidencias.length === 0) {
      evidencias.push('Prototipo interactivo en proceso y mapa de experiencia cargado.');
    }

    const projectData = { resumen, problematicas, evidencias };

    return await this.aiService.generatePitchCoachAnalysis(projectData);
  }
}