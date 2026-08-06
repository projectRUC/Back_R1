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
}
