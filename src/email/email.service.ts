import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async enviarNotificacionActividad(email: string, nombreUsuario: string, nombreActividad: string, nombreProyecto: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Nueva Actividad Asignada: ${nombreActividad}`,
        text: `Hola ${nombreUsuario},\n\nSe te ha asignado una nueva actividad "${nombreActividad}" en el proyecto "${nombreProyecto}".\n\nSaludos,\nEl equipo PAEC.`,
        html: `<p>Hola <strong>${nombreUsuario}</strong>,</p><p>Se te ha asignado una nueva actividad <strong>"${nombreActividad}"</strong> en el proyecto <strong>"${nombreProyecto}"</strong>.</p><p>Saludos,<br>El equipo PAEC.</p>`,
      });
      this.logger.log(`Correo de actividad enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${email}:`, error);
    }
  }

  async enviarNotificacionEquipo(email: string, nombreUsuario: string, nombreEquipo: string, rol: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Has sido añadido al equipo ${nombreEquipo}`,
        text: `Hola ${nombreUsuario},\n\nHas sido añadido al equipo "${nombreEquipo}" con el rol de "${rol}".\n\nSaludos,\nEl equipo PAEC.`,
        html: `<p>Hola <strong>${nombreUsuario}</strong>,</p><p>Has sido añadido al equipo <strong>"${nombreEquipo}"</strong> con el rol de <strong>"${rol}"</strong>.</p><p>Saludos,<br>El equipo PAEC.</p>`,
      });
      this.logger.log(`Correo de equipo enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${email}:`, error);
    }
  }

  async enviarNotificacionProyecto(email: string, nombreUsuario: string, nombreEquipo: string, nombreProyecto: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `Tu equipo ha sido asignado al proyecto ${nombreProyecto}`,
        text: `Hola ${nombreUsuario},\n\nTu equipo "${nombreEquipo}" ha sido asignado para trabajar en el proyecto "${nombreProyecto}".\n\nSaludos,\nEl equipo PAEC.`,
        html: `<p>Hola <strong>${nombreUsuario}</strong>,</p><p>Tu equipo <strong>"${nombreEquipo}"</strong> ha sido asignado para trabajar en el proyecto <strong>"${nombreProyecto}"</strong>.</p><p>Saludos,<br>El equipo PAEC.</p>`,
      });
      this.logger.log(`Correo de proyecto enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar correo a ${email}:`, error);
    }
  }

  async enviarCodigoRecuperacion(email: string, nombreUsuario: string, codigo: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Código de recuperación de contraseña',
        text: `Hola ${nombreUsuario},\n\nTu código de recuperación es: ${codigo}\n\nEste código es válido por 5 minutos. Si tú no solicitaste este cambio, ignora este correo.\n\nSaludos,\nEl equipo PAEC.`,
        html: `<p>Hola <strong>${nombreUsuario}</strong>,</p><p>Tu código de recuperación es:</p><p style="font-size: 28px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${codigo}</p><p>Este código es válido por <strong>5 minutos</strong>. Si tú no solicitaste este cambio, ignora este correo.</p><p>Saludos,<br>El equipo PAEC.</p>`,
      });
      this.logger.log(`Código de recuperación enviado a ${email}`);
    } catch (error) {
      this.logger.error(`Error al enviar código de recuperación a ${email}:`, error);
      throw error;
    }
  }
}