import {
  BadRequestException,
  ConflictException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CreateDesignSprintEvidenceDto } from './dto/create-design-sprint-evidence.dto';
import {
  DesignSprintEvidence,
  DesignSprintEvidenceDocument,
  DIA_POR_FASE,
  FaseDesignSprint,
  ORDEN_FASES,
} from 'src/database/schemas/design-sprint-evidence.schema';

/** Tamaño máximo permitido por evidencia individual (evita desbordamiento de memoria) */
const MAX_BASE64_SIZE_MB = 5;
// El Base64 infla el tamaño real ~1.37x, así que ajustamos el límite de caracteres
const MAX_BASE64_LENGTH = MAX_BASE64_SIZE_MB * 1024 * 1024 * 1.37;

@Injectable()
export class DesignSprintService {
  constructor(
    @InjectModel(DesignSprintEvidence.name)
    private readonly evidenceModel: Model<DesignSprintEvidenceDocument>,
  ) {}

  /**
   * Registra el avance de una fase del Design Sprint para un equipo.
   * Valida: orden de fases (regla de negocio) y tamaño de las evidencias.
   */
  async registrarAvance(dto: CreateDesignSprintEvidenceDto) {
    this.validarTamanoEvidencias(dto.contenidoBase64);
    await this.validarOrdenDeFases(dto.equipoId, dto.proyectoId, dto.fase);
    await this.validarNoDuplicado(dto.equipoId, dto.proyectoId, dto.fase);

    const nuevaEvidencia = new this.evidenceModel({
      equipoId: dto.equipoId,
      proyectoId: new Types.ObjectId(dto.proyectoId),
      fase: dto.fase,
      fechaRegistro: new Date(),
      contenidoBase64: dto.contenidoBase64 ?? [],
      comentarios: dto.comentarios ?? '',
    });

    return nuevaEvidencia.save();
  }

  /**
   * Devuelve el estado de las 4 fases para un equipo/proyecto,
   * indicando cuáles se han iniciado y cuándo.
   * No incluye el contenidoBase64 completo para no sobrecargar la respuesta.
   */
  async consultarAvancePorEquipo(equipoId: number, proyectoId: string) {
    const registros = await this.evidenceModel
      .find({ equipoId, proyectoId: new Types.ObjectId(proyectoId) })
      .select('-contenidoBase64')
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
      };
    });
  }

  /**
   * Devuelve el registro completo (incluyendo evidencias Base64)
   * de una fase específica.
   */
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

    return registro;
  }

  // ==========================================================
  // Validaciones internas
  // ==========================================================

  private validarTamanoEvidencias(contenidoBase64?: string[]) {
    if (!contenidoBase64 || contenidoBase64.length === 0) return;

    for (const evidencia of contenidoBase64) {
      const contenidoLimpio = this.limpiarPrefijoBase64(evidencia);

      if (contenidoLimpio.length > MAX_BASE64_LENGTH) {
        throw new PayloadTooLargeException(
          `Cada evidencia debe pesar máximo ${MAX_BASE64_SIZE_MB}MB. Una de las evidencias enviadas excede ese límite.`,
        );
      }

      const esBase64Valido =
        /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
          contenidoLimpio,
        );

      if (!esBase64Valido) {
        throw new BadRequestException(
          'Una de las evidencias no tiene un formato Base64 válido',
        );
      }
    }
  }

  private limpiarPrefijoBase64(base64: string) {
    // soporta que venga como Data URL: "data:image/png;base64,AAAA..."
    return base64.includes(',') ? base64.split(',')[1] : base64;
  }

  /**
   * Regla de negocio: no se puede registrar la fase de un día
   * si no se ha iniciado la fase del día hábil anterior.
   * Mapear no tiene fase previa, así que siempre está permitida.
   */
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
        `No puedes registrar la fase "${fase}" (${DIA_POR_FASE[fase]}) porque aún no se ha iniciado la fase "${fasePrevia}" (${DIA_POR_FASE[fasePrevia]}), correspondiente al día hábil anterior.`,
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
      throw new ConflictException(
        `El equipo ya registró la fase "${fase}". Si necesitas corregirla, usa el endpoint de actualización.`,
      );
    }
  }
}
