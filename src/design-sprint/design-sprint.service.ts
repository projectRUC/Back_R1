import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateDesignSprintEvidenceDto } from './dto/create-design-sprint-evidence.dto';
import {
  IDesignSprintEvidence,
  DIA_POR_FASE,
  FaseDesignSprint,
  ORDEN_FASES,
  DesignSprintEvidence,
  DesignSprintEvidenceDocument,
} from './design-sprint.interface';

@Injectable()
export class DesignSprintService {
  constructor(
    @InjectModel(DesignSprintEvidence.name)
    private readonly evidenceModel: Model<DesignSprintEvidenceDocument>,
  ) {}

  async registrarAvance(dto: CreateDesignSprintEvidenceDto) {
    await this.validarOrdenDeFases(dto.equipoId, dto.proyectoId, dto.fase);
    await this.validarNoDuplicado(dto.equipoId, dto.proyectoId, dto.fase);

    const nuevaEvidencia = new this.evidenceModel({
      equipoId: dto.equipoId,
      proyectoId: new Types.ObjectId(dto.proyectoId),
      fase: dto.fase,
      fechaRegistro: new Date(),
      archivosUrls: dto.archivosUrls ?? [],
      comentarios: dto.comentarios ?? '',
    });

    return nuevaEvidencia.save();
  }

  async consultarAvancePorEquipo(equipoId: number, proyectoId: string) {
    const registros = await this.evidenceModel
      .find({ equipoId, proyectoId: new Types.ObjectId(proyectoId) })
      .sort({ fechaRegistro: 1 })
      .exec();

    return ORDEN_FASES.map((fase) => {
      const registro = registros.find((r) => r.fase === fase);
      return {
        fase,
        dia: DIA_POR_FASE[fase],
        iniciado: !!registro,
        fechaRegistro: registro?.fechaRegistro ?? null,
        comentarios: registro?.comentarios ?? null,
        cantidadArchivos: (registro as any)?.archivosUrls?.length ?? 0,
      };
    });
  }

  async consultarEvidenciasPorFase(
    equipoId: number,
    proyectoId: string,
    fase: FaseDesignSprint,
  ) {
    const registro = await this.evidenceModel
      .findOne({ equipoId, proyectoId: new Types.ObjectId(proyectoId), fase })
      .exec();

    if (!registro) {
      throw new BadRequestException(
        `El equipo aún no ha registrado la fase "${fase}"`,
      );
    }

    return {
      _id: registro._id,
      equipoId: registro.equipoId,
      proyectoId: registro.proyectoId,
      fase: registro.fase,
      fechaRegistro: registro.fechaRegistro,
      comentarios: registro.comentarios,
      created_at: (registro as any).createdAt,
      archivosUrls: (registro as any).archivosUrls || [],
    };
  }

  private async validarOrdenDeFases(
    equipoId: number,
    proyectoId: string,
    fase: FaseDesignSprint,
  ) {
    const indiceFase = ORDEN_FASES.indexOf(fase);
    if (indiceFase === 0) return;

    const fasePrevia = ORDEN_FASES[indiceFase - 1];
    const yaIniciada = await this.evidenceModel.exists({
      equipoId,
      proyectoId: new Types.ObjectId(proyectoId),
      fase: fasePrevia,
    });

    if (!yaIniciada) {
      throw new BadRequestException(
        `Debes iniciar primero la fase "${fasePrevia}".`,
      );
    }
  }

  private async validarNoDuplicado(
    equipoId: number,
    proyectoId: string,
    fase: FaseDesignSprint,
  ) {
    const yaExiste = await this.evidenceModel.exists({
      equipoId,
      proyectoId: new Types.ObjectId(proyectoId),
      fase,
    });

    if (yaExiste) {
      throw new ConflictException(`La fase "${fase}" ya fue registrada.`);
    }
  }
}