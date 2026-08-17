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
  Patch,
  UseGuards,
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
import { AiService } from '../ai/ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

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
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Alumno', 'Docente', 'Scrum Master')
export class DesignSprintController {
  constructor(
    private readonly designSprintService: DesignSprintService,
    private readonly aiService: AiService, // <-- CORREGIDO: Se agrega 'private readonly'
  ) {}

  @Post()
  crear(@Body('eq_id') eq_id: number, @Body('proyecto_id') proyecto_id: string) {
    return this.designSprintService.crear(Number(eq_id), proyecto_id);
  }

  @Get()
  findByEquipoProyecto(
    @Query('eq_id') eq_id: string,
    @Query('proyecto_id') proyecto_id: string,
  ) {
    return this.designSprintService.findByEquipoYProyecto(Number(eq_id), proyecto_id);
  }

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

  // ---------- RETROALIMENTACIÓN DOCENTE ----------

  // Soporta /mapeo/comentarios y /mapeo/comentario
  @Post([':id/mapeo/comentarios', ':id/mapeo/comentario'])
  agregarComentarioMapeo(
    @Param('id') id: string,
    @Body() dto: AddComentarioDto,
  ) {
    return this.designSprintService.agregarComentarioMapeo(id, dto);
  }

  // Soporta /bocetos/:bocetoId/comentarios, /boceto/:bocetoId/comentarios y sus formas en singular
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

  // Soporta /prototipo/comentarios y /prototipo/comentario
  @Post([':id/prototipo/comentarios', ':id/prototipo/comentario'])
  agregarComentarioPrototipo(
    @Param('id') id: string,
    @Body() dto: AddComentarioDto,
  ) {
    return this.designSprintService.agregarComentarioPrototipo(id, dto);
  }

  // Soporta /comentarios-generales y /comentario-general
  @Post([':id/comentarios-generales', ':id/comentario-general'])
  agregarComentarioGeneral(
    @Param('id') id: string,
    @Body() dto: AddComentarioDto,
  ) {
    return this.designSprintService.agregarComentarioGeneral(id, dto);
  }

  // ---------- VALIDACIÓN Y VOBO (Viernes) ----------
  @Patch(':id/vobo')
  actualizarVoBo(
    @Param('id') id: string,
    @Body() dto: UpdateVoBoDto,
  ) {
    return this.designSprintService.actualizarVoBo(id, dto);
  }

  // ---------- IA PITCH COACH ----------

  @Post(':id/ai-pitch-coach')
  async runPitchCoach(@Param('id') id: string): Promise<PitchCoachResponseDto> {
    const project = await this.designSprintService.findById(id);

    if (!project) {
      throw new NotFoundException(`El Design Sprint con ID ${id} no existe.`);
    }

    const doc = project as any;

    // 1. Extraemos el resumen (Buscamos en la fase de mapeo/prototipo o raíz)
    const resumen =
      doc.mapeo?.meta_a_largo_plazo ||
      doc.prototipo?.descripcion ||
      doc.resumen ||
      doc.descripcion ||
      'Proyecto enfocado en la solución de problemas mediante un producto/servicio innovador.';

    // 2. Extraemos las problemáticas (Buscamos preguntas Cmo Podramos / mapeo / retos)
    const rawProblematicas =
      doc.mapeo?.preguntas_como_podriamos ||
      doc.problematicas ||
      doc.retos;

    const problematicas =
      Array.isArray(rawProblematicas) && rawProblematicas.length > 0
        ? rawProblematicas
        : ['Falta de validación clara de la propuesta de valor con clientes potenciales'];

    // 3. Extraemos las evidencias (Buscamos enlaces de prototipo, bocetos o archivos adjuntos)
    const evidencias: string[] = [];

    if (doc.prototipo?.enlace) evidencias.push(`Enlace al prototipo: ${doc.prototipo.enlace}`);
    if (doc.prototipo?.archivos?.length) evidencias.push(`Archivos de prototipo subidos: ${doc.prototipo.archivos.length}`);
    if (doc.bocetos?.length) evidencias.push(`Cantidad de bocetos registrados: ${doc.bocetos.length}`);
    if (doc.evidencias?.length) evidencias.push(...doc.evidencias);

    if (evidencias.length === 0) {
      evidencias.push('Prototipo interactivo en proceso y mapa de experiencia cargado.');
    }

    // 4. Formateamos el objeto para consumirlo en el servicio de Gemini
    const projectData = {
      resumen,
      problematicas,
      evidencias,
    };

    return await this.aiService.generatePitchCoachAnalysis(projectData);
  }
}