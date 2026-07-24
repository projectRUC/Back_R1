import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Si es una excepción de NestJS tomamos su estatus; si es un error no controlado (ej. caída de base de datos) devolvemos 500
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extraemos el mensaje de forma segura
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Error interno en el servidor. Consulta con el administrador.';

    // Formateamos el JSON que siempre recibirá el FrontEnd (React)
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'object' &&
        'message' in (message as Record<string, any>)
          ? (message as Record<string, any>).message
          : message,
    };

    // Imprimimos el error en la terminal para que nosotros como desarrolladores lo veamos
    this.logger.error(
      `MÉTODO: ${request.method} | RUTA: ${request.url} | STATUS: ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Enviamos el JSON limpio al cliente
    response.status(status).json(errorResponse);
  }
}
