import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Proyecto, Parcial, Sprint } from '../database/schemas/proyecto.schema';
import { Actividad } from '../database/schemas/actividad.schema';
import { CreateProyectoDto, UpdateProyectoDto, CreatePeriodoDto, UpdatePeriodoDto, AddComentarioDto, UpdateComentarioDto } from './dto/proyecto.dto';
import { CryptoService } from '../cryptoModule/CryptoService';

@Injectable()
export class ProyectosService {
  constructor(
    @InjectModel(Proyecto.name) private proyectoModel: Model<Proyecto>,
    @InjectModel(Actividad.name) private actividadModel: Model<Actividad>,
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

  /** Descifra un array de comentarios (parciales/sprints) en memoria */
  private decryptComentarios(comentarios: any[] | undefined) {
    if (!comentarios || comentarios.length === 0) return comentarios;
    return comentarios.map((c: any) => {
      const obj = c.toObject ? c.toObject() : c;
      return { ...obj, comentario: this.safeDec(obj.comentario) };
    });
  }

  /** Descifra un array de periodos (parciales o sprints), incluyendo objetivo y comentarios */
  private decryptPeriodos(periodos: any[] | undefined) {
    if (!periodos || periodos.length === 0) return periodos;
    return periodos.map((p: any) => {
      const obj = p.toObject ? p.toObject() : p;
      return {
        ...obj,
        objetivo: this.safeDec(obj.objetivo),
        comentarios: this.decryptComentarios(obj.comentarios),
      };
    });
  }

  /**
   * Descifra en memoria los campos de texto libre de un proyecto
   * (descripción, objetivos y comentarios de parciales/sprints) antes de devolverlo.
   * No modifica el documento en BD.
   */
  private decryptProyecto(proyecto: any): Proyecto {
    if (!proyecto) return proyecto;
    const obj = proyecto.toObject ? proyecto.toObject() : proyecto;
    obj.descripcion = this.safeDec(obj.descripcion);
    obj.parciales = this.decryptPeriodos(obj.parciales);
    obj.sprints = this.decryptPeriodos(obj.sprints);
    return obj;
  }

  private decryptProyectos(proyectos: any[]): Proyecto[] {
    return proyectos.map((p) => this.decryptProyecto(p));
  }

  // ─────────────────────────────────────────────────────────────────────────

  async createProyecto(dto: CreateProyectoDto): Promise<Proyecto> {
    const start = new Date(dto.fecha_inicio);
    const end = new Date(dto.fecha_fin);
    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    const nuevoProyecto = new this.proyectoModel({
      nombre: dto.nombre,
      fecha_inicio: start,
      fecha_fin: end,
      descripcion: '',
      parciales: [],
      sprints: [],
    });

    const guardado = await nuevoProyecto.save();
    return this.decryptProyecto(guardado);
  }

  async getProyectos(): Promise<Proyecto[]> {
    const proyectos = await this.proyectoModel.find().exec();
    return this.decryptProyectos(proyectos);
  }

  async getProyectoById(id: string): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id).exec();
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    return this.decryptProyecto(proyecto);
  }

  async updateProyecto(id: string, dto: UpdateProyectoDto): Promise<Proyecto> {
    // Cifrar únicamente descripcion si viene en el dto; el resto pasa igual
    const dtoCifrado: any = { ...dto };
    if ((dto as any).descripcion !== undefined) {
      dtoCifrado.descripcion = this.enc((dto as any).descripcion);
    }

    const proyecto = await this.proyectoModel.findByIdAndUpdate(
      id,
      { $set: dtoCifrado },
      { new: true }
    );
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    return this.decryptProyecto(proyecto);
  }

  async deleteProyecto(id: string): Promise<Proyecto> {
    const activitiesCount = await this.actividadModel.countDocuments({ proyecto_id: id });
    if (activitiesCount > 0) {
      throw new ConflictException('No se puede borrar el proyecto porque existen actividades asociadas a este');
    }
    const proyecto = await this.proyectoModel.findByIdAndDelete(id).exec();
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    return this.decryptProyecto(proyecto);
  }

  private distributeDates(startDate: Date, endDate: Date, count: number) {
    const totalMs = endDate.getTime() - startDate.getTime();
    const msPerPeriod = Math.floor(totalMs / count);
    const periods: { fecha_inicio: Date; fecha_fin: Date; }[] = [];
    
    let currentStart = new Date(startDate.getTime());
    
    for (let i = 0; i < count; i++) {
      const currentEnd = (i === count - 1) 
        ? new Date(endDate.getTime()) 
        : new Date(currentStart.getTime() + msPerPeriod);
      
      periods.push({
        fecha_inicio: new Date(currentStart.getTime()),
        fecha_fin: new Date(currentEnd.getTime()),
      });
      
      currentStart = new Date(currentEnd.getTime());
    }
    
    return periods;
  }

  async createParciales(id: string, dto: CreatePeriodoDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    
    if (proyecto.parciales && proyecto.parciales.length > 0) {
      throw new BadRequestException('El proyecto ya tiene parciales registrados');
    }

    if (dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const periodos = this.distributeDates(proyecto.fecha_inicio, proyecto.fecha_fin, dto.cantidad);
    
    const parciales = periodos.map((p, index) => ({
      num_parcial: index + 1,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      objetivo: '',
      comentarios: []
    }));

    proyecto.parciales = parciales as any;
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  async createSprints(id: string, dto: CreatePeriodoDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    
    if (proyecto.sprints && proyecto.sprints.length > 0) {
      throw new BadRequestException('El proyecto ya tiene sprints registrados');
    }

    if (dto.cantidad <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    const periodos = this.distributeDates(proyecto.fecha_inicio, proyecto.fecha_fin, dto.cantidad);
    
    const sprints = periodos.map((p, index) => ({
      num_sprint: index + 1,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      objetivo: '',
      comentarios: []
    }));

    proyecto.sprints = sprints as any;
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  private validatePeriodoFechas(
    proyecto: Proyecto, 
    periodos: Array<Parcial | Sprint>, 
    currentIndex: number, 
    newStart?: Date, 
    newEnd?: Date
  ) {
    if (!newStart && !newEnd) return;

    const currentPeriod = periodos[currentIndex];
    const start = newStart ? new Date(newStart) : new Date(currentPeriod.fecha_inicio);
    const end = newEnd ? new Date(newEnd) : new Date(currentPeriod.fecha_fin);

    if (start >= end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin del periodo');
    }
    
    if (start < new Date(proyecto.fecha_inicio) || end > new Date(proyecto.fecha_fin)) {
      throw new BadRequestException('Las fechas del periodo deben estar dentro de las fechas del proyecto');
    }

    for (let i = 0; i < periodos.length; i++) {
      if (i === currentIndex) continue;
      const pStart = new Date(periodos[i].fecha_inicio);
      const pEnd = new Date(periodos[i].fecha_fin);
      
      if ((start >= pStart && start < pEnd) || (end > pStart && end <= pEnd) || (start <= pStart && end >= pEnd)) {
         throw new BadRequestException('Las fechas del periodo se cruzan con otro periodo existente');
      }
    }
  }

  async updateParcial(id: string, num_parcial: number, dto: UpdatePeriodoDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const index = proyecto.parciales.findIndex(p => p.num_parcial === num_parcial);
    if (index === -1) throw new NotFoundException('Parcial no encontrado');

    this.validatePeriodoFechas(proyecto, proyecto.parciales, index, dto.fecha_inicio, dto.fecha_fin);

    if (dto.fecha_inicio) proyecto.parciales[index].fecha_inicio = new Date(dto.fecha_inicio);
    if (dto.fecha_fin) proyecto.parciales[index].fecha_fin = new Date(dto.fecha_fin);
    if (dto.objetivo !== undefined) proyecto.parciales[index].objetivo = this.enc(dto.objetivo);

    // We must tell mongoose that the array was modified
    proyecto.markModified('parciales');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  async updateSprint(id: string, num_sprint: number, dto: UpdatePeriodoDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const index = proyecto.sprints.findIndex(s => s.num_sprint === num_sprint);
    if (index === -1) throw new NotFoundException('Sprint no encontrado');

    this.validatePeriodoFechas(proyecto, proyecto.sprints, index, dto.fecha_inicio, dto.fecha_fin);

    if (dto.fecha_inicio) proyecto.sprints[index].fecha_inicio = new Date(dto.fecha_inicio);
    if (dto.fecha_fin) proyecto.sprints[index].fecha_fin = new Date(dto.fecha_fin);
    if (dto.objetivo !== undefined) proyecto.sprints[index].objetivo = this.enc(dto.objetivo);

    proyecto.markModified('sprints');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  async deleteParcial(id: string, num_parcial: number): Promise<Proyecto> {
    const activitiesCount = await this.actividadModel.countDocuments({ proyecto_id: id, parcial: num_parcial });
    if (activitiesCount > 0) {
      throw new ConflictException('No se puede borrar el parcial porque existen actividades asociadas a este');
    }

    const proyecto = await this.proyectoModel.findByIdAndUpdate(
      id,
      { $pull: { parciales: { num_parcial } } },
      { new: true }
    );
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    return this.decryptProyecto(proyecto);
  }

  async deleteSprint(id: string, num_sprint: number): Promise<Proyecto> {
    const activitiesCount = await this.actividadModel.countDocuments({ proyecto_id: id, sprint: num_sprint });
    if (activitiesCount > 0) {
      throw new ConflictException('No se puede borrar el sprint porque existen actividades asociadas a este');
    }

    const proyecto = await this.proyectoModel.findByIdAndUpdate(
      id,
      { $pull: { sprints: { num_sprint } } },
      { new: true }
    );
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');
    return this.decryptProyecto(proyecto);
  }

  async addComentarioParcial(id: string, num_parcial: number, dto: AddComentarioDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const index = proyecto.parciales.findIndex(p => p.num_parcial === num_parcial);
    if (index === -1) throw new NotFoundException('Parcial no encontrado');

    proyecto.parciales[index].comentarios.push({
      usu_id: dto.usu_id,
      comentario: this.enc(dto.comentario)
    } as any);

    proyecto.markModified('parciales');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  async editComentarioParcial(id: string, num_parcial: number, comment_id: string, dto: UpdateComentarioDto): Promise<Proyecto> {
    // Assuming comment_id could just be an index for simplicity, or we can look it up by standard mongoose _id if present.
    // However, the schema uses ComentarioSchema which has an implicit _id.
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const pIndex = proyecto.parciales.findIndex(p => p.num_parcial === num_parcial);
    if (pIndex === -1) throw new NotFoundException('Parcial no encontrado');

    const cIndex = proyecto.parciales[pIndex].comentarios.findIndex((c: any) => c._id.toString() === comment_id);
    if (cIndex === -1) throw new NotFoundException('Comentario no encontrado');

    if (proyecto.parciales[pIndex].comentarios[cIndex].usu_id !== dto.req_usu_id) {
      throw new ConflictException('No tienes permisos para editar este comentario');
    }

    proyecto.parciales[pIndex].comentarios[cIndex].comentario = this.enc(dto.comentario);
    proyecto.markModified('parciales');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }
  
  // Similar comments operations for Sprints can be implemented
  async addComentarioSprint(id: string, num_sprint: number, dto: AddComentarioDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const index = proyecto.sprints.findIndex(s => s.num_sprint === num_sprint);
    if (index === -1) throw new NotFoundException('Sprint no encontrado');

    proyecto.sprints[index].comentarios.push({
      usu_id: dto.usu_id,
      comentario: this.enc(dto.comentario)
    } as any);

    proyecto.markModified('sprints');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }

  async editComentarioSprint(id: string, num_sprint: number, comment_id: string, dto: UpdateComentarioDto): Promise<Proyecto> {
    const proyecto = await this.proyectoModel.findById(id);
    if (!proyecto) throw new NotFoundException('Proyecto no encontrado');

    const sIndex = proyecto.sprints.findIndex(s => s.num_sprint === num_sprint);
    if (sIndex === -1) throw new NotFoundException('Sprint no encontrado');

    const cIndex = proyecto.sprints[sIndex].comentarios.findIndex((c: any) => c._id.toString() === comment_id);
    if (cIndex === -1) throw new NotFoundException('Comentario no encontrado');

    if (proyecto.sprints[sIndex].comentarios[cIndex].usu_id !== dto.req_usu_id) {
      throw new ConflictException('No tienes permisos para editar este comentario');
    }

    proyecto.sprints[sIndex].comentarios[cIndex].comentario = this.enc(dto.comentario);
    proyecto.markModified('sprints');
    const guardado = await proyecto.save();
    return this.decryptProyecto(guardado);
  }
}