import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Herramienta } from '../database/schemas/herramienta.schema';
import { Proyecto } from '../database/schemas/proyecto.schema';
import { EstatusHerramienta } from '../common/providers/enums/estatus-herramienta.enum';
import { CreateHerramientaDto, UpdateHerramientaDto } from './dto/herramienta.dto';
import { CryptoService } from '../cryptoModule/CryptoService';

@Injectable()
export class HerramientasService {
  constructor(
    @InjectModel(Herramienta.name) private herramientaModel: Model<Herramienta>,
    @InjectModel(Proyecto.name) private proyectoModel: Model<Proyecto>,
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

  /** Descifra en memoria los campos de texto libre de una herramienta antes de devolverla */
  private decryptHerramienta(herramienta: any): Herramienta {
    const obj = herramienta.toObject ? herramienta.toObject() : herramienta;
    obj.nombre_herra = this.safeDec(obj.nombre_herra);
    obj.descripcion = this.safeDec(obj.descripcion);
    obj.uso = this.safeDec(obj.uso);
    obj.url_herramienta = this.safeDec(obj.url_herramienta);
    obj.evaluacion_o_motivo = this.safeDec(obj.evaluacion_o_motivo);
    return obj;
  }

  private decryptHerramientas(herramientas: any[]): Herramienta[] {
    return herramientas.map((h) => this.decryptHerramienta(h));
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valida que no excedan 5 herramientas activas (PENDIENTE o APROBADA) en un proyecto.
   * Las rechazadas (NO_APROBADA) no cuentan en este límite, permitiendo a los alumnos registrar reemplazos.
   */
  private async validarLimiteHerramientasActivas(proyectoId: string | Types.ObjectId): Promise<void> {
    const count = await this.herramientaModel.countDocuments({
      proyecto_id: new Types.ObjectId(proyectoId),
      estatus: { $in: [EstatusHerramienta.PENDIENTE, EstatusHerramienta.APROBADA] },
    });

    if (count >= 5) {
      throw new ConflictException(
        'El proyecto ya alcanzó el límite máximo de 5 herramientas en estatus Pendiente o Aprobada. Para registrar o aprobar otra herramienta, primero debe rechazarse o eliminarse alguna de las actuales.',
      );
    }
  }

  async createHerramienta(dto: CreateHerramientaDto): Promise<Herramienta> {
    const proyecto = await this.proyectoModel.findById(dto.proyecto_id);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const estatusInicial = dto.estatus || EstatusHerramienta.PENDIENTE;

    // Si la herramienta nacerá con estatus PENDIENTE o APROBADA, verificamos el cupo de 5
    if (
      estatusInicial === EstatusHerramienta.PENDIENTE ||
      estatusInicial === EstatusHerramienta.APROBADA
    ) {
      await this.validarLimiteHerramientasActivas(dto.proyecto_id);
    }

    const nuevaHerramienta = new this.herramientaModel({
      ...dto,
      nombre_herra: this.enc(dto.nombre_herra),
      descripcion: this.enc(dto.descripcion),
      uso: this.enc(dto.uso),
      url_herramienta: this.enc(dto.url_herramienta),
      evaluacion_o_motivo: this.enc(dto.evaluacion_o_motivo),
      proyecto_id: new Types.ObjectId(dto.proyecto_id),
      estatus: estatusInicial,
    });

    const guardada = await nuevaHerramienta.save();
    return this.decryptHerramienta(guardada);
  }

  async getHerramientasByProyecto(proyecto_id: string): Promise<Herramienta[]> {
    const herramientas = await this.herramientaModel
      .find({ proyecto_id: new Types.ObjectId(proyecto_id) })
      .exec();
    return this.decryptHerramientas(herramientas);
  }

  async getHerramientas(): Promise<Herramienta[]> {
    const herramientas = await this.herramientaModel.find().exec();
    return this.decryptHerramientas(herramientas);
  }

  async getHerramientaById(id: string): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findById(id).exec();
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return this.decryptHerramienta(herramienta);
  }

  async updateHerramienta(id: string, dto: UpdateHerramientaDto): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findById(id);
    if (!herramienta) {
      throw new NotFoundException('Herramienta no encontrada');
    }

    // Si la herramienta actualmente está NO_APROBADA y se intenta cambiar a APROBADA o PENDIENTE
    // debemos verificar el cupo, para evitar que el profesor apruebe algo si los alumnos ya subieron un reemplazo
    if (dto.estatus && dto.estatus !== herramienta.estatus) {
      const pasaAActiva =
        dto.estatus === EstatusHerramienta.PENDIENTE ||
        dto.estatus === EstatusHerramienta.APROBADA;
      const estabaRechazada = herramienta.estatus === EstatusHerramienta.NO_APROBADA;

      if (estabaRechazada && pasaAActiva) {
        await this.validarLimiteHerramientasActivas(herramienta.proyecto_id);
      }
    }

    // Cifrar únicamente los campos de texto libre que vengan en el dto de actualización
    const dtoCifrado: UpdateHerramientaDto = { ...dto };
    if (dto.nombre_herra !== undefined) dtoCifrado.nombre_herra = this.enc(dto.nombre_herra);
    if (dto.descripcion !== undefined) dtoCifrado.descripcion = this.enc(dto.descripcion);
    if (dto.uso !== undefined) dtoCifrado.uso = this.enc(dto.uso);
    if (dto.url_herramienta !== undefined) dtoCifrado.url_herramienta = this.enc(dto.url_herramienta);
    if (dto.evaluacion_o_motivo !== undefined) dtoCifrado.evaluacion_o_motivo = this.enc(dto.evaluacion_o_motivo);

    Object.assign(herramienta, dtoCifrado);
    const guardada = await herramienta.save();
    return this.decryptHerramienta(guardada);
  }

  async deleteHerramienta(id: string): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findByIdAndDelete(id).exec();
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return this.decryptHerramienta(herramienta);
  }
}