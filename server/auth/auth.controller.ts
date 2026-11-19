import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ProfileService } from './profile.service';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

class ChangerMotDePasseDto {
  @IsString() @MaxLength(200) actuel: string;
  @IsString() @MaxLength(200) nouveau: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly profileService: ProfileService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  // v8.6.5 : changement de son propre mot de passe (seule route ouverte, avec
  // /auth/me, tant qu'un changement obligatoire est en attente).
  @Post('mot-de-passe')
  @HttpCode(HttpStatus.OK)
  changerMotDePasse(@Body() dto: ChangerMotDePasseDto, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.authService.changerMotDePasse(user.id, dto.actuel, dto.nouveau, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Post('deconnexion')
  @HttpCode(HttpStatus.OK)
  deconnexion(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.authService.deconnexion(user, { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfileData(user.id);
  }
}
