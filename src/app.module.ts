import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { join } from 'path';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { FilesModule } from './files/files.module';
import { DesignSprintModule } from './design-sprint/design-sprint.module';

import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EquiposModule } from './equipos/equipos.module';
import { GruposModule } from './grupos/grupos.module';
import { AiModule } from './ai/ai.module';
import { ProyectosModule } from './proyectos/proyectos.module';
import { ActividadesModule } from './actividades/actividades.module';
import { HerramientasModule } from './herramientas/herramientas.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ScrumModule } from './scrum/scrum.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AlertasModule } from './alertas/alertas.module';
import { AlumnosModule } from './alumnos/alumnos.module';
import { PerfilModule } from './perfil/perfil.module';
import { EmailModule } from './email/email.module';
import { AuditLogModule } from './audit/audit-log.module';
import { AuditLoggerInterceptor } from './common/interceptors/audit-logger.interceptor';

@Module({
  imports: [
    // Rate Limiting OWASP (Protección contra DDoS y Fuerza Bruta)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minuto
        limit: 100, // Límite global estándar
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 5, // Límite estricto de 5 intentos por minuto para autenticación
      }
    ]),
    // Variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URL'),
      }),
      inject: [ConfigService],
    }),

    // Cron Jobs
    ScheduleModule.forRoot(),

    // Archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // PostgreSQL (Prisma)
    PrismaModule,

    // Autenticación y Auditoría
    AuthModule,
    AuditLogModule,
    PerfilModule,

    // Módulos del sistema
    EquiposModule,
    GruposModule,
    FilesModule,
    DesignSprintModule,
    AiModule,
    ProyectosModule,
    ActividadesModule,
    HerramientasModule,
    DashboardModule,
    ScrumModule,
    NotificacionesModule,
    AlertasModule,
    AlumnosModule,
    PerfilModule,
    EmailModule,
    
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplica Rate Limiting a toda la API
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Interceptor Global de Trazabilidad (Zero PII - LGPDPPSO)
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggerInterceptor,
    },
  ],
})
export class AppModule {}