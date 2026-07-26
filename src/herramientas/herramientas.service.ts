import { Injectable, NotFoundException } from '@nestjs/common';
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

  async createHerramienta(dto: CreateHerramientaDto): Promise<Herramienta> {
    const proyecto = await this.proyectoModel.findById(dto.proyecto_id);
    if (!proyecto) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const nuevaHerramienta = new this.herramientaModel({
      ...dto,
      proyecto_id: new Types.ObjectId(dto.proyecto_id),
      estatus: dto.estatus || EstatusHerramienta.PENDIENTE,
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
    const herramienta = await this.herramientaModel.findByIdAndUpdate(
      id,
      { $set: dto },
      { new: true },
    );
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return herramienta;
  }

  async deleteHerramienta(id: string): Promise<Herramienta> {
    const herramienta = await this.herramientaModel.findByIdAndDelete(id).exec();
    if (!herramienta) throw new NotFoundException('Herramienta no encontrada');
    return herramienta;
  }
}
