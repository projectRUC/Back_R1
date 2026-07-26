import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Herramienta } from '../database/schemas/herramienta.schema';
import { Proyecto } from '../database/schemas/proyecto.schema';
import { EstatusHerramienta } from '../common/providers/enums/estatus-herramienta.enum';
import { CreateHerramientaDto, UpdateHerramientaDto } from './dto/herramienta.dto';

@Injectable()
export class HerramientasService {
  constructor(
    @InjectModel(Herramienta.name) private herramientaModel: Model<Herramienta>,
    @InjectModel(Proyecto.name) private proyectoModel: Model<Proyecto>,
  ) {}

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
      proyecto_id: new Types.ObjectId(dto.proyecto_id),
      estatus: estatusInicial,
    });

    return await nuevaHerramienta.save();
  }

  async getHerramientasByProyecto(proyecto_id: string): Promise<Herramienta[]> {
    return await this.herramientaModel
      .find({ proyecto_id: new Types.ObjectId(proyecto_id) })
      .exec();
  }

  async getHerramientas(): Promise<Herramienta[]> {
    return await this.herramientaModel.find().exec();
  }

  async getHerramientaById(id: string): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findById(id).exec();
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return herramienta;
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

    Object.assign(herramienta, dto);
    return await herramienta.save();
  }

  async deleteHerramienta(id: string): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findByIdAndDelete(id).exec();
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return herramienta;
  }
}
