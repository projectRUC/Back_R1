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

@Module({
  imports: [
    // Carga variables de entorno (.env) globalmente
    ConfigModule.forRoot({ isGlobal: true }),

    // Conexión a MongoDB (para módulos que lo necesiten)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URL'),
      }),
      inject: [ConfigService],
    }),

    // Servir archivos estáticos desde /uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Módulo global de Prisma (PostgreSQL/Supabase)
    PrismaModule,

    // Módulo de autenticación JWT + RBAC
    AuthModule,

    FilesModule,
    DesignSprintModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}