import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // en pruebas acepta cualquier origen; en producción restringe a tu dominio del front
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Parsea las cookies de cada petición entrante (necesario para JWT en cookie)
  app.use(cookieParser());

  // ValidationPipe global: activa todas las validaciones de class-validator en los DTOs
  // whitelist: elimina propiedades no definidas en el DTO (protección contra mass assignment)
  // forbidNonWhitelisted: lanza error si se envían propiedades extra
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // convierte tipos automáticamente (ej: string → number en rolId)
    }),
  );

  // Aumenta el límite de payload JSON para soportar evidencias en Base64 (design-sprint)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Servidor corriendo en: http://localhost:${process.env.PORT ?? 3000}`,
  );
}
bootstrap();
