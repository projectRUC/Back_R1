import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Registra un evento de auditoría en MongoDB de forma asíncrona.
   *
   * Cumple con la política Zero PII: solo almacena usuarioActorId, metodoHttp, ruta, modulo y fechaHora.
   */
  async registrarLog(data: CreateAuditLogDto): Promise<void> {
    try {
      await this.auditLogModel.create({
        usuarioActorId: data.usuarioActorId ?? null,
        metodoHttp: data.metodoHttp,
        ruta: data.ruta,
        modulo: data.modulo,
        fechaHora: data.fechaHora ?? new Date(),
      });
    } catch (error) {
      // Captura interna para garantizar que fallos en auditoría no interrumpan la respuesta del cliente
      this.logger.error(
        `Error al guardar log de auditoría [${data.metodoHttp} ${data.ruta}]: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
