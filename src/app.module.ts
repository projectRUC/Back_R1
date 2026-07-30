import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
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
@Module({
  imports: [
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

    // Archivos estáticos
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // PostgreSQL (Prisma)
    PrismaModule,

    // Autenticación
    AuthModule,

    // Módulos del sistema
    EquiposModule,
    GruposModule,
    FilesModule,
    DesignSprintModule,
    AiModule, // <--- Módulo de Inteligencia Artificial
    ProyectosModule,
    ActividadesModule,
    HerramientasModule,
    DashboardModule,
    ScrumModule,
    NotificacionesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

