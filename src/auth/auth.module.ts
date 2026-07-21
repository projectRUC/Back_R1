import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    // PassportModule configura la estrategia por defecto como 'jwt'
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JwtModule.registerAsync lee JWT_SECRET y JWT_EXPIRES_IN del .env
    // via ConfigService (en lugar de hardcodear valores sensibles)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          // Cast necesario: ConfigService retorna string genérico pero JwtModuleOptions
          // espera el tipo StringValue de la librería `ms`.
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // Registrar la estrategia para que Passport la use
  ],
  // Exportar para que otros módulos puedan usar JwtModule si lo necesitan
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
