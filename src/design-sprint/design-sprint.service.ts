import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {

  DesignSprintEvidence,
  DesignSprintEvidenceDocument,
  DIA_POR_FASE,
  FaseDesignSprint,
  IAvanceDesignSprint,
  IAvanceFase,
  IDesignSprintEvidence,
  ORDEN_FASES,
} from './design-sprint.interface';

import { CreateDesignSprintEvidenceDto } from './dto/design-sprint.dto';

@Injectable()
export class DesignSprintService {
  constructor(
    @InjectModel(DesignSprintEvidence.name)
    private readonly evidenceModel: Model<DesignSprintEvidenceDocument>,
  ) {}

  async registrarEvidencia(
    dto: CreateDesignSprintEvidenceDto,
  ): Promise<IDesignSprintEvidence> {
    const proyectoObjectId = new Types.ObjectId(dto.proyectoId);

    await this.validarFaseAnterior(dto.equipoId, proyectoObjectId, dto.fase);

    const yaExiste = await this.evidenceModel.exists({
      equipoId: dto.equipoId,
      proyectoId: proyectoObjectId,
      fase: dto.fase,
    });

    if (yaExiste) {
      throw new ConflictException(
        `La fase "${dto.fase}" (${DIA_POR_FASE[dto.fase]}) ya fue registrada para este equipo y proyecto`,
      );
    }

    try {
      const nuevo = new this.evidenceModel({
        equipoId: dto.equipoId,
        proyectoId: proyectoObjectId,
        fase: dto.fase,
        fechaRegistro: new Date(),
        archivosUrls: dto.archivosUrls ?? [],
        comentarios: dto.comentarios ?? '',
      });

      const guardado = await nuevo.save();
      return this.toIDesignSprintEvidence(guardado);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new ConflictException(
          'Ya existe un registro para esta fase, equipo y proyecto',
        );
      }
      throw error;
    }
  }

  async obtenerAvance(
    equipoId: number,
    proyectoId: string,
  ): Promise<IAvanceDesignSprint> {
    const proyectoObjectId = new Types.ObjectId(proyectoId);

    const registros = await this.evidenceModel.find({
      equipoId,
      proyectoId: proyectoObjectId,
    });

    return ORDEN_FASES.map((fase) => {
      const registro = registros.find((r) => r.fase === fase);

      const avance: IAvanceFase = {
        fase,
        dia: DIA_POR_FASE[fase],
        iniciado: !!registro,
        fechaRegistro: registro ? registro.fechaRegistro.toISOString() : null,
        comentarios: registro ? registro.comentarios : null,
        cantidadArchivos: registro ? registro.archivosUrls.length : 0,
      };

      return avance;
    });
  }

  async obtenerFase(
    equipoId: number,
    proyectoId: string,
    fase: FaseDesignSprint,
  ): Promise<IDesignSprintEvidence> {
    const proyectoObjectId = new Types.ObjectId(proyectoId);

    const registro = await this.evidenceModel.findOne({
      equipoId,
      proyectoId: proyectoObjectId,
      fase,
    });

    if (!registro) {
      throw new NotFoundException(
        `No se ha registrado la fase "${fase}" para este equipo y proyecto`,
      );
    }

    return this.toIDesignSprintEvidence(registro);
  }

  private async validarFaseAnterior(
    equipoId: number,
    proyectoObjectId: Types.ObjectId,
    fase: FaseDesignSprint,
  ): Promise<void> {
    const indiceFase = ORDEN_FASES.indexOf(fase);

    if (indiceFase <= 0) {
      return;
    }

    const faseAnterior = ORDEN_FASES[indiceFase - 1];

    const existeAnterior = await this.evidenceModel.exists({
      equipoId,
      proyectoId: proyectoObjectId,
      fase: faseAnterior,
    });

    if (!existeAnterior) {
      throw new BadRequestException(
        `No puedes registrar "${fase}" (${DIA_POR_FASE[fase]}) sin haber iniciado antes "${faseAnterior}" (${DIA_POR_FASE[faseAnterior]})`,
      );
    }
  }

  private toIDesignSprintEvidence(
    doc: DesignSprintEvidenceDocument,
  ): IDesignSprintEvidence {
    return {
      _id: doc._id.toString(),
      equipoId: doc.equipoId,
      proyectoId: doc.proyectoId.toString(),
      fase: doc.fase,
      fechaRegistro: doc.fechaRegistro.toISOString(),
      archivosUrls: doc.archivosUrls,
      comentarios: doc.comentarios,
      created_at: (doc as any).created_at
        ? (doc as any).created_at.toISOString()
        : doc.fechaRegistro.toISOString(),
    };
  }
}