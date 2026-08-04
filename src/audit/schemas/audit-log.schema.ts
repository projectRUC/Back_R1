import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Esquema AuditLog para cumplimiento LGPDPPSO y trazabilidad.
 *
 * POLÍTICA ZERO PII:
 * Este esquema almacena ÚNICAMENTE metadatos de auditoría operacional.
 * Queda estrictamente prohibido persistir payloads, bodies, passwords,
 * nombres, correos electrónicos o direcciones IP en texto claro.
 */
@Schema({
  collection: 'audit_logs',
  timestamps: false, // Usamos fechaHora explícita requerida por la normativa
  versionKey: false,
})
export class AuditLog {
  @Prop({ type: Number, required: false, default: null })
  usuarioActorId: number | null;

  @Prop({ type: String, required: true })
  metodoHttp: string;

  @Prop({ type: String, required: true })
  ruta: string;

  @Prop({ type: String, required: true })
  modulo: string;

  @Prop({ type: Date, required: true, default: Date.now })
  fechaHora: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
