import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Daily, RespuestaDaily } from '../database/schemas/daily.schema';
import { CreateDailyDto } from './dto/create-daily.dto';
import { UpdateRespuestaDto } from './dto/update-respuesta.dto';
import { AiService } from '../ai/ai.service';
import { PrismaService } from '../database/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Injectable()
export class ScrumService {
  private readonly logger = new Logger(ScrumService.name);

  constructor(
    @InjectModel(Daily.name) private dailyModel: Model<Daily>,
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  async createDaily(dto: CreateDailyDto) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    let daily = await this.dailyModel.findOne({
      eq_id: dto.eq_id,
      fecha_daily: hoy,
    });

    if (!daily) {
      daily = new this.dailyModel({
        eq_id: dto.eq_id,
        proyecto_id: new Types.ObjectId(dto.proyecto_id),
        sprint: dto.sprint,
        parcial: dto.parcial,
        fecha_daily: hoy,
        respuestas: [],
      });
    }

    const nuevaRespuesta: RespuestaDaily = {
      usu_id: dto.usu_id,
      hecho_ayer: dto.hecho_ayer,
      por_hacer: dto.por_hacer,
      inconvenientes: dto.inconvenientes,
    };

    daily.respuestas.push(nuevaRespuesta);
    const dailyGuardado = await daily.save();

    this.analyzeRespuestaAsync(nuevaRespuesta, dailyGuardado);

    return dailyGuardado;
  }

  async getDailiesByEquipo(eq_id: number) {
    return this.dailyModel.find({ eq_id }).sort({ fecha_daily: -1 }).exec();
  }

  async getDailyById(dailyId: string) {
    return this.dailyModel.findById(dailyId).exec();
  }

  async updateRespuesta(dailyId: string, usuId: number, updateDto: UpdateRespuestaDto) {
    const daily = await this.dailyModel.findById(dailyId);
    if (!daily) {
      throw new Error('Daily no encontrado');
    }

    const respuestaIndex = daily.respuestas.findIndex(r => r.usu_id === usuId);
    if (respuestaIndex === -1) {
      throw new Error('Respuesta del usuario no encontrada en este Daily');
    }

    if (updateDto.hecho_ayer !== undefined) daily.respuestas[respuestaIndex].hecho_ayer = updateDto.hecho_ayer;
    if (updateDto.por_hacer !== undefined) daily.respuestas[respuestaIndex].por_hacer = updateDto.por_hacer;
    if (updateDto.inconvenientes !== undefined) daily.respuestas[respuestaIndex].inconvenientes = updateDto.inconvenientes;

    return daily.save();
  }

  async deleteRespuesta(dailyId: string, usuId: number) {
    const daily = await this.dailyModel.findById(dailyId);
    if (!daily) {
      throw new Error('Daily no encontrado');
    }

    daily.respuestas = daily.respuestas.filter(r => r.usu_id !== usuId);
    
    if (daily.respuestas.length === 0) {
      await this.dailyModel.findByIdAndDelete(dailyId);
      return { deleted: true, message: 'Daily eliminado completamente por falta de respuestas' };
    }

    return daily.save();
  }

  async deleteDaily(dailyId: string) {
    return this.dailyModel.findByIdAndDelete(dailyId).exec();
  }

  private async analyzeRespuestaAsync(respuesta: RespuestaDaily, daily: Daily) {
    try {
      const prompt = `
        Analiza el siguiente reporte de Daily Scrum de un desarrollador.
        ¿Qué hice ayer?: ${respuesta.hecho_ayer}
        ¿Qué haré hoy?: ${respuesta.por_hacer}
        ¿Qué me impide avanzar?: ${respuesta.inconvenientes}
      `;

      const systemInstruction = `
        Eres un asistente experto en metodologías ágiles y Scrum. Tu tarea es detectar si el desarrollador tiene un bloqueo, retraso crítico o impedimento que requiera la intervención inmediata del Scrum Master.
        Debes responder ÚNICAMENTE en formato JSON válido con la siguiente estructura, sin markdown ni texto extra:
        {
          "hasBlocker": boolean,
          "reason": "string (explicación breve de por qué se considera un bloqueo o por qué no lo es)"
        }
      `;

      const aiResponse = await this.aiService.generateStructuredResponse({
        prompt,
        systemInstruction,
      });

      const cleanResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanResponse);

      if (parsed.hasBlocker) {
        const equipo = await this.prisma.equipo.findUnique({
          where: { eqId: daily.eq_id },
          select: { scrumMasterId: true },
        });

        if (equipo && equipo.scrumMasterId) {
          await this.notificacionesService.crearNotificacion({
            usu_id: equipo.scrumMasterId, // Notificar al Scrum Master
            titulo: 'Bloqueo Detectado en Daily',
            mensaje: parsed.reason,
            tipo: 'SCRUM_BLOCKER',
            metadata: {
              equipoId: daily.eq_id,
              autorId: respuesta.usu_id,
              dailyId: daily._id.toString()
            }
          });
          this.logger.log(`Notificación de bloqueo generada para Scrum Master ID ${equipo.scrumMasterId} por el Daily de Autor ID ${respuesta.usu_id}`);
        } else {
          this.logger.warn(`No se encontró Scrum Master para el Equipo ID ${daily.eq_id}`);
        }
      }
    } catch (error) {
      this.logger.error('Error al analizar la respuesta del daily asincrónicamente', error);
    }
  }
}
