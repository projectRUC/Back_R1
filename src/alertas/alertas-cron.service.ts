import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Actividad } from '../database/schemas/actividad.schema';
import { AlertasService } from './alertas.service';
import { PrismaService } from '../database/prisma.service';
import { EstatusActividad } from '../common/providers/enums/estatus-actividad.enum';
import { TipoAlerta } from '../database/schemas/alerta.schema';

@Injectable()
export class AlertasCronService {
  private readonly logger = new Logger(AlertasCronService.name);

  constructor(
    @InjectModel(Actividad.name) private actividadModel: Model<Actividad>,
    private readonly alertasService: AlertasService,
    private readonly prisma: PrismaService,
  ) {}

  // Se ejecuta todos los días a medianoche. Para probar, podrías usar CronExpression.EVERY_MINUTE
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async verificarVencimientos() {
    this.logger.log('Iniciando verificación de actividades vencidas...');

    const ahora = new Date();

    try {
      // 1. Obtener actividades vencidas en MongoDB que no estén terminadas
      const actividadesVencidas = await this.actividadModel.find({
        fecha_fin: { $lt: ahora },
        estatus: { $ne: EstatusActividad.TERMINADO },
      }).exec();

      if (actividadesVencidas.length === 0) {
        this.logger.log('No hay actividades vencidas nuevas.');
        return;
      }

      this.logger.log(`Se encontraron ${actividadesVencidas.length} actividades vencidas.`);

      // 2. Procesar cada actividad y generar la alerta
      for (const actividad of actividadesVencidas) {
        // Obtenemos el equipo desde Postgres para saber quién es el Scrum Master
        const equipo = await this.prisma.equipo.findUnique({
          where: { eqId: actividad.eq_id },
          select: { scrumMasterId: true },
        });

        if (equipo && equipo.scrumMasterId) {
          // Generamos la alerta
          await this.alertasService.crearAlerta({
            scrum_master_id: equipo.scrumMasterId,
            actividad_id: actividad._id as any,
            tipo: TipoAlerta.VENCIMIENTO,
            mensaje: `La actividad "${actividad.nom_actividad}" ha excedido su fecha límite y sigue en estatus "${actividad.estatus}".`,
          });
        }
      }

      this.logger.log('Verificación de actividades vencidas completada con éxito.');
    } catch (error) {
      this.logger.error('Error durante la verificación de actividades vencidas', error);
    }
  }
}
