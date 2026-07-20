import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: true, // en pruebas acepta cualquier origen; en producción restringe a tu dominio del front
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Aumenta el límite de payload JSON para soportar evidencias en Base64 (design-sprint)
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();