import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UtilisateursModule } from '../administration/utilisateurs/utilisateurs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { AuthSchemaService } from './auth-schema.service';
import { JournalSecuriteService } from './journal-securite.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ActivationService } from './activation.service';
import { ActivationController } from './activation.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionsModule } from '../administration/permissions/permissions.module';

@Module({
  imports: [
    UtilisateursModule,
    NotificationsModule,
    PermissionsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '8h') as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController, ActivationController],
  providers: [AuthService, ActivationService, JwtStrategy, ProfileService, AuthSchemaService, JournalSecuriteService],
  exports: [JournalSecuriteService],
})
export class AuthModule {}
