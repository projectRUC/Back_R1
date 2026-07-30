import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FilesService } from 'src/files/files.service';
import { CreateMapeoDto } from './dto/create-mapeo.dto';
import { CreateBocetoDto } from './dto/create-boceto.dto';
import { CreatePuntuacionDto } from './dto/create-puntuacion.dto';
import { CreatePrototipoDto } from './dto/create-prototipo.dto';
import { SprintDesign } from 'src/database/schemas/sprint-design.schema';

@Injectable()
export class DesignSprintService {
  constructor(
    @InjectModel(SprintDesign.name)
    private readonly sprintModel: Model<SprintDesign>,
    private readonly filesService: FilesService,
  ) {}

  // Helper para validar o mapear la propiedad proyecto_id segun su tipo
  private parseProyectoId(proyecto_id: string): any {
    return Types.ObjectId.isValid(proyecto_id)
      ? new Types.ObjectId(proyecto_id)
      : proyecto_id;
  }

  // Crea el contenedor del ciclo de ideación para un equipo/proyecto
  async crear(eq_id: number, proyecto_id: string) {
    const parsedProyectoId = this.parseProyectoId(proyecto_id);

    const existente = await this.sprintModel.findOne({
      eq_id,
      proyecto_id: parsedProyectoId,
    });
    if (existente) {
      throw new BadRequestException(
        'Este equipo ya tiene un ciclo de ideación registrado para este proyecto',
      );
    }

    const nuevo = new this.sprintModel({
      eq_id,
      proyecto_id: parsedProyectoId,
      status: 'mapeo',
      bocetos: [],
      entrevistas: [],
      comentarios_generales: [],
    });
    return nuevo.save();
  }

  async findById(id: string) {
    const sprint = await this.sprintModel.findById(id).exec();
    if (!sprint) throw new NotFoundException('Ciclo de ideación no encontrado');
    return sprint;
  }

  async findByEquipoYProyecto(eq_id: number, proyecto_id: string) {
    const parsedProyectoId = this.parseProyectoId(proyecto_id);

    const sprint = await this.sprintModel
      .findOne({ eq_id, proyecto_id: parsedProyectoId })
      .exec();
    
    // Retornar null o un objeto vacío evita lanzar 404 estricto si aún no ha sido creado
    if (!sprint) return null; 
    return sprint;
  }

  // ---------- FASE: MAPEAR (Lunes) ----------
  async registrarMapeo(
    id: string,
    dto: CreateMapeoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    if (sprint.mapeo?.proyecto_problema) {
      throw new BadRequestException('La fase Mapear ya fue registrada para este ciclo');
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-mapeo', uploadedBy);

    sprint.mapeo = {
      proyecto_problema: dto.proyecto_problema,
      proyecto_objective: dto.proyecto_objective,
      enfoque: dto.enfoque,
      archivos,
      comentarios: dto.comentario
        ? [{ usu_id: Number(uploadedBy) || null, texto: dto.comentario } as any]
        : [],
    } as any;

    sprint.status = 'boceto';
    return sprint.save();
  }

  // ---------- FASE: BOCETAR (Martes) ----------
  async registrarBoceto(
    id: string,
    dto: CreateBocetoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    if (!sprint.mapeo?.proyecto_problema) {
      throw new BadRequestException(
        'No puedes registrar Bocetar: la fase Mapear (día hábil anterior) no ha sido iniciada',
      );
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-boceto', uploadedBy);

    sprint.bocetos.push({
      propuesta: dto.propuesta,
      usu_id: dto.usu_id,
      status: dto.status ?? 'propuesto',
      archivos,
      puntuaciones: [],
      comentarios: dto.comentario
        ? [{ usu_id: dto.usu_id, texto: dto.comentario } as any]
        : [],
    } as any);

    if (sprint.status === 'boceto') sprint.status = 'decidir';
    return sprint.save();
  }



  // ---------- FASE: PROTOTIPAR (Jueves) ----------
  async registrarPrototipo(
    id: string,
    dto: CreatePrototipoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    const hayVotacion = sprint.bocetos?.some((b) => b.puntuaciones?.length > 0);
    if (!hayVotacion) {
      throw new BadRequestException(
        'No puedes registrar Prototipar: la fase Decidir (día hábil anterior) no ha sido iniciada',
      );
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-prototipo', uploadedBy);

    sprint.prototipo = {
      nombre_prototipo: dto.nombre_prototipo,
      descripcion: dto.descripcion,
      archivos,
      comentarios: dto.comentario
        ? [{ usu_id: Number(uploadedBy) || null, texto: dto.comentario } as any]
        : [],
    } as any;

    sprint.status = 'prototipo_completado';
    return sprint.save();
  }

  // ---------- Utilidad: sube archivos con FilesService ----------
  private async subirArchivos(
    files: Express.Multer.File[],
    category: string,
    uploadedBy?: string,
  ) {
    if (!files || files.length === 0) return [];

    const guardados = await Promise.all(
      files.map((file) =>
        this.filesService.saveFileRecord(file, { category, uploadedBy }),
      ),
    );

    return guardados.map((f) => f.toObject());
  }

// ---------- FASE: DECIDIR (Miércoles) — votación de bocetos ----------
async puntuarBoceto(id: string, bocetoId: string, dto: CreatePuntuacionDto) {
  const sprint = await this.findById(id);

  if (!sprint.bocetos || sprint.bocetos.length === 0) {
    throw new BadRequestException(
      'No puedes registrar Decidir: la fase Bocetar no tiene entregas',
    );
  }

  const boceto = (sprint.bocetos as any).id(bocetoId);
  if (!boceto) throw new NotFoundException('Boceto no encontrado');

  const usuIdNum = Number(dto.usu_id);
  const indexVoto = boceto.puntuaciones.findIndex(
    (p: any) => p.usu_id === usuIdNum,
  );

  if (indexVoto >= 0) {
    // Si vuelve a votar con valor 0 o el mismo valor, se elimina el voto (Toggle)
    if (dto.valor === 0 || boceto.puntuaciones[indexVoto].valor === dto.valor) {
      boceto.puntuaciones.splice(indexVoto, 1);
    } else {
      // Actualizar valor del voto
      boceto.puntuaciones[indexVoto].valor = dto.valor;
      if (dto.comentario) {
        boceto.puntuaciones[indexVoto].comentario = {
          usu_id: usuIdNum,
          texto: dto.comentario,
        };
      }
    }
  } else {
    // Si no ha votado, agregar el nuevo voto
    boceto.puntuaciones.push({
      usu_id: usuIdNum,
      valor: dto.valor ?? 1,
      comentario: dto.comentario
        ? ({ usu_id: usuIdNum, texto: dto.comentario } as any)
        : undefined,
    });
  }

  if (sprint.status === 'boceto' || sprint.status === 'decidir') {
    sprint.status = 'prototipo';
  }

  return sprint.save();
}
}