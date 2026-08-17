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
import { AddComentarioDto } from './dto/add-comentario.dto';
import { UpdateVoBoDto } from './dto/update-vobo.dto';
import { SprintDesign } from 'src/database/schemas/sprint-design.schema';
import { CryptoService } from 'src/cryptoModule/CryptoService';

@Injectable()
export class DesignSprintService {
  constructor(
    @InjectModel(SprintDesign.name)
    private readonly sprintModel: Model<SprintDesign>,
    private readonly filesService: FilesService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers de cifrado / descifrado
  // ─────────────────────────────────────────────────────────────────────────

  private enc(text: string): string;
  private enc(text: string | null | undefined): string | undefined;
  private enc(text?: string | null): string | undefined {
    if (!text) return undefined;
    return CryptoService.encrypt(text);
  }

  /** Descifra sin lanzar excepción si el valor no está cifrado (datos legacy) o viene vacío */
  private safeDec(value?: string | null): string | undefined | null {
    if (!value) return value;
    try {
      return CryptoService.decrypt(value);
    } catch {
      return value;
    }
  }

  private buildComentarioCifrado(usu_id: number, texto: string) {
    const cifrado = this.enc(texto);
    return {
      usu_id,
      texto: cifrado,
      comentario: cifrado,
      fecha: new Date(),
    };
  }

  private decryptComentarios(comentarios: any[] | undefined) {
    if (!comentarios || comentarios.length === 0) return comentarios;
    return comentarios.map((c: any) => {
      const obj = typeof c?.toObject === 'function' ? c.toObject() : c;
      return {
        ...obj,
        texto: this.safeDec(obj.texto),
        comentario: this.safeDec(obj.comentario),
      };
    });
  }

  /**
   * Convierte el resultado a JSON plano puro. Esto garantiza que los ObjectId
   * de MongoDB (_id, proyecto_id, y los _id de subdocumentos) lleguen al cliente
   * como cadenas y no como objetos, evitando el bug "[object Object]" en las URLs.
   */
  private toPlainJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  /**
   * Descifra los campos de texto libre de un ciclo de ideación.
   *
   * IMPORTANTE: trabaja siempre sobre una COPIA plana (toObject) para no mutar
   * el documento de Mongoose. Si mutara el documento, un save() posterior
   * escribiría el texto en claro en la base de datos.
   */
  private decryptSprint(sprint: any) {
    if (!sprint) return sprint;

    const obj = typeof sprint.toObject === 'function' ? sprint.toObject() : { ...sprint };

    if (obj.mapeo) {
      obj.mapeo = {
        ...obj.mapeo,
        proyecto_problema: this.safeDec(obj.mapeo.proyecto_problema),
        proyecto_objective: this.safeDec(obj.mapeo.proyecto_objective),
        enfoque: this.safeDec(obj.mapeo.enfoque),
        comentarios: this.decryptComentarios(obj.mapeo.comentarios),
      };
    }

    if (obj.bocetos && obj.bocetos.length > 0) {
      obj.bocetos = obj.bocetos.map((b: any) => {
        const boceto = typeof b?.toObject === 'function' ? b.toObject() : b;
        return {
          ...boceto,
          propuesta: this.safeDec(boceto.propuesta),
          comentarios: this.decryptComentarios(boceto.comentarios),
          puntuaciones: (boceto.puntuaciones || []).map((p: any) => {
            const punt = typeof p?.toObject === 'function' ? p.toObject() : p;
            return {
              ...punt,
              comentario: punt.comentario
                ? {
                    ...punt.comentario,
                    texto: this.safeDec(punt.comentario.texto),
                    comentario: this.safeDec(punt.comentario.comentario),
                  }
                : punt.comentario,
            };
          }),
        };
      });
    }

    if (obj.prototipo) {
      obj.prototipo = {
        ...obj.prototipo,
        nombre_prototipo: this.safeDec(obj.prototipo.nombre_prototipo),
        descripcion: this.safeDec(obj.prototipo.descripcion),
        comentarios: this.decryptComentarios(obj.prototipo.comentarios),
      };
    }

    if (obj.comentarios_generales) {
      obj.comentarios_generales = this.decryptComentarios(obj.comentarios_generales);
    }

    if (obj.validacion_experto) {
      obj.validacion_experto = {
        ...obj.validacion_experto,
        nombre_experto: this.safeDec(obj.validacion_experto.nombre_experto),
        profesion_institucion: this.safeDec(obj.validacion_experto.profesion_institucion),
        comentarios_viabilidad: this.safeDec(obj.validacion_experto.comentarios_viabilidad),
      };
    }

    // Normaliza todos los ObjectId a string antes de salir del servicio
    return this.toPlainJson(obj);
  }

  /**
   * Valida y convierte el proyecto_id. Debe ser el _id del documento de MongoDB,
   * NO el proyectoId numérico de PostgreSQL/Prisma.
   */
  private parseProyectoId(proyecto_id: string): Types.ObjectId {
    if (!proyecto_id || !Types.ObjectId.isValid(proyecto_id)) {
      throw new BadRequestException(
        `El proyecto_id "${proyecto_id}" no es un ObjectId válido de MongoDB. ` +
          'Debes enviar el _id del documento del proyecto en Mongo (proyecto.mongoId), ' +
          'no el ID numérico de PostgreSQL.',
      );
    }
    return new Types.ObjectId(proyecto_id);
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
    const guardado = await nuevo.save();
    return this.decryptSprint(guardado);
  }

  /** Uso INTERNO: devuelve el documento de Mongoose con los campos aún cifrados. */
  async findById(id: string) {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Ciclo de ideación no encontrado (ID inválido)');
    }
    const sprint = await this.sprintModel.findById(id).exec();
    if (!sprint) throw new NotFoundException('Ciclo de ideación no encontrado');
    return sprint;
  }

  /** Versión pública para controllers: devuelve el objeto descifrado. */
  async findByIdDecrypted(id: string) {
    const sprint = await this.findById(id);
    return this.decryptSprint(sprint);
  }

  async findByEquipoYProyecto(eq_id: number, proyecto_id: string) {
    const parsedProyectoId = this.parseProyectoId(proyecto_id);

    const sprint = await this.sprintModel
      .findOne({ eq_id, proyecto_id: parsedProyectoId })
      .exec();

    if (!sprint) return null;
    return this.decryptSprint(sprint);
  }

  // ---------- FASE: MAPEAR (Lunes) ----------
  async registrarMapeo(
    id: string,
    dto: CreateMapeoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    if (sprint.validacion_experto?.vobo_docente) {
      throw new BadRequestException(
        'El ciclo de ideación ya cuenta con el Visto Bueno del docente y no puede ser modificado',
      );
    }

    if (sprint.mapeo?.proyecto_problema) {
      throw new BadRequestException('La fase Mapear ya fue registrada para este ciclo');
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-mapeo', uploadedBy);
    const uploaderId = Number(uploadedBy) || 0;

    sprint.mapeo = {
      proyecto_problema: this.enc(dto.proyecto_problema),
      proyecto_objective: this.enc(dto.proyecto_objective),
      enfoque: this.enc(dto.enfoque),
      archivos,
      comentarios: dto.comentario
        ? [this.buildComentarioCifrado(uploaderId, dto.comentario)]
        : [],
    } as any;

    sprint.status = 'boceto';
    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- FASE: BOCETAR (Martes) ----------
  async registrarBoceto(
    id: string,
    dto: CreateBocetoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    if (sprint.validacion_experto?.vobo_docente) {
      throw new BadRequestException(
        'El ciclo de ideación ya cuenta con el Visto Bueno del docente y no puede ser modificado',
      );
    }

    if (!sprint.mapeo?.proyecto_problema) {
      throw new BadRequestException(
        'No puedes registrar Bocetar: la fase Mapear (día hábil anterior) no ha sido iniciada',
      );
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-boceto', uploadedBy);

    sprint.bocetos.push({
      propuesta: this.enc(dto.propuesta),
      usu_id: dto.usu_id,
      status: dto.status ?? 'propuesto',
      archivos,
      puntuaciones: [],
      comentarios: dto.comentario
        ? [this.buildComentarioCifrado(dto.usu_id, dto.comentario)]
        : [],
    } as any);

    if (sprint.status === 'boceto') sprint.status = 'decidir';
    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- FASE: DECIDIR (Miércoles) — votación de bocetos ----------
  async puntuarBoceto(id: string, bocetoId: string, dto: CreatePuntuacionDto) {
    const sprint = await this.findById(id);

    if (sprint.validacion_experto?.vobo_docente) {
      throw new BadRequestException(
        'El ciclo de ideación ya cuenta con el Visto Bueno del docente y no puede ser modificado',
      );
    }

    if (!sprint.bocetos || sprint.bocetos.length === 0) {
      throw new BadRequestException(
        'No puedes registrar Decidir: la fase Bocetar no tiene entregas',
      );
    }

    const boceto = (sprint.bocetos as any).id(bocetoId);
    if (!boceto) throw new NotFoundException('Boceto no encontrado');

    const usuIdNum = Number(dto.usu_id);
    const indexVoto = boceto.puntuaciones.findIndex((p: any) => p.usu_id === usuIdNum);

    const comentarioObj = dto.comentario
      ? {
          usu_id: usuIdNum,
          texto: this.enc(dto.comentario),
          comentario: this.enc(dto.comentario),
        }
      : undefined;

    if (indexVoto >= 0) {
      if (dto.valor === 0 || boceto.puntuaciones[indexVoto].valor === dto.valor) {
        boceto.puntuaciones.splice(indexVoto, 1);
      } else {
        boceto.puntuaciones[indexVoto].valor = dto.valor;
        if (dto.comentario) {
          boceto.puntuaciones[indexVoto].comentario = comentarioObj;
        }
      }
    } else {
      boceto.puntuaciones.push({
        usu_id: usuIdNum,
        valor: dto.valor ?? 1,
        comentario: comentarioObj,
      });
    }

    if (sprint.status === 'boceto' || sprint.status === 'decidir') {
      sprint.status = 'prototipo';
    }

    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- FASE: PROTOTIPAR (Jueves) ----------
  async registrarPrototipo(
    id: string,
    dto: CreatePrototipoDto,
    files: Express.Multer.File[],
    uploadedBy?: string,
  ) {
    const sprint = await this.findById(id);

    if (sprint.validacion_experto?.vobo_docente) {
      throw new BadRequestException(
        'El ciclo de ideación ya cuenta con el Visto Bueno del docente y no puede ser modificado',
      );
    }

    const hayVotacion = sprint.bocetos?.some((b) => b.puntuaciones?.length > 0);
    if (!hayVotacion) {
      throw new BadRequestException(
        'No puedes registrar Prototipar: la fase Decidir (día hábil anterior) no ha sido iniciada',
      );
    }

    const archivos = await this.subirArchivos(files, 'design-sprint-prototipo', uploadedBy);
    const uploaderId = Number(uploadedBy) || 0;

    sprint.prototipo = {
      nombre_prototipo: this.enc(dto.nombre_prototipo),
      descripcion: this.enc(dto.descripcion),
      archivos,
      comentarios: dto.comentario
        ? [this.buildComentarioCifrado(uploaderId, dto.comentario)]
        : [],
    } as any;

    sprint.status = 'prototipo_completado';
    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- RETROALIMENTACIÓN DOCENTE POR ETAPA ----------

  async agregarComentarioMapeo(sprintId: string, dto: { texto: string; usu_id: number }) {
    if (!sprintId || !Types.ObjectId.isValid(sprintId)) {
      throw new NotFoundException('Ciclo de ideación no encontrado (ID inválido)');
    }

    const cifrado = this.enc(dto.texto);
    const actualizado = await this.sprintModel.findByIdAndUpdate(
      sprintId,
      {
        $push: {
          'mapeo.comentarios': {
            usu_id: dto.usu_id,
            texto: cifrado,
            comentario: cifrado,
            fecha: new Date(),
          },
        },
      },
      { new: true, runValidators: true },
    );

    if (!actualizado) throw new NotFoundException('Ciclo de ideación no encontrado');
    return this.decryptSprint(actualizado);
  }

  async agregarComentarioBoceto(id: string, bocetoId: string, dto: AddComentarioDto) {
    const sprint = await this.findById(id);
    const boceto = (sprint.bocetos as any).id(bocetoId);

    if (!boceto) {
      throw new NotFoundException('Boceto no encontrado');
    }

    boceto.comentarios.push(this.buildComentarioCifrado(dto.usu_id, dto.texto));

    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  async agregarComentarioPrototipo(id: string, dto: AddComentarioDto) {
    const sprint = await this.findById(id);

    if (!sprint.prototipo) {
      sprint.prototipo = {
        nombre_prototipo: '',
        descripcion: '',
        archivos: [],
        comentarios: [],
      } as any;
    }

    sprint.prototipo.comentarios.push(this.buildComentarioCifrado(dto.usu_id, dto.texto));

    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  async agregarComentarioGeneral(id: string, dto: AddComentarioDto) {
    const sprint = await this.findById(id);

    sprint.comentarios_generales.push(this.buildComentarioCifrado(dto.usu_id, dto.texto));

    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- FASE: VALIDACION Y VOBO (Viernes) ----------
  async actualizarVoBo(id: string, dto: UpdateVoBoDto) {
    const sprint = await this.findById(id);

    if (!sprint.validacion_experto) {
      sprint.validacion_experto = {} as any;
    }

    if (dto.nombre_experto !== undefined)
      sprint.validacion_experto.nombre_experto = this.enc(dto.nombre_experto);
    if (dto.profesion_institucion !== undefined)
      sprint.validacion_experto.profesion_institucion = this.enc(dto.profesion_institucion);
    if (dto.comentarios_viabilidad !== undefined)
      sprint.validacion_experto.comentarios_viabilidad = this.enc(dto.comentarios_viabilidad);
    if (dto.dictamen !== undefined) sprint.validacion_experto.dictamen = dto.dictamen;

    if (dto.vobo_docente !== undefined) {
      sprint.validacion_experto.vobo_docente = dto.vobo_docente;
      if (dto.vobo_docente === true) {
        sprint.status = 'validado';
      }
    }

    sprint.markModified('validacion_experto');
    const guardado = await sprint.save();
    return this.decryptSprint(guardado);
  }

  // ---------- Utilidad: sube archivos con FilesService ----------
  private async subirArchivos(
    files: Express.Multer.File[],
    category: string,
    uploadedBy?: string,
  ) {
    if (!files || files.length === 0) return [];

    const guardados = await Promise.all(
      files.map((file) => this.filesService.saveFileRecord(file, { category, uploadedBy })),
    );

    return guardados.map((f) => f.toObject());
  }
}