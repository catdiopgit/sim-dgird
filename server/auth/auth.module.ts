import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UtilisateursModule } from '../administration/utilisateurs/utilisateurs.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ProfileService } from './profile.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UtilisateursModule,
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
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ProfileService],
})
export class AuthModule {}
