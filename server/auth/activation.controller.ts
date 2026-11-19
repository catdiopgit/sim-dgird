import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PermissionsGuard } from '../administration/permissions/permissions.guard';
import { RequirePermission } from '../administration/permissions/require-permission.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';
import { ActivationService } from './activation.service';

class ActiverDto {
  @IsString() @MaxLength(100) jeton: string;
  @IsString() @MaxLength(200) nouveau: string;
}

const origine = (req: Request): string | null => {
  const o = req.get('origin') ?? req.get('referer');
  try {
    return o ? new URL(o).origin : null;
  } catch {
    return null;
  }
};

@Controller()
export class ActivationController {
  constructor(private readonly activation: ActivationService) {}

  @Post('administration/utilisateurs/:id/envoyer-activation')
  @UseGuards(PermissionsGuard)
  @RequirePermission('utilisateurs', 'modifier')
  @HttpCode(HttpStatus.OK)
  envoyer(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Req() req: Request) {
    return this.activation.envoyer(id, user, origine(req), { ip: req.ip, userAgent: req.get('user-agent') });
  }

  @Public()
  @Get('auth/activation')
  verifier(@Query('jeton') jeton: string) {
    return this.activation.verifier(jeton);
  }

  @Public()
  @Post('auth/activation')
  @HttpCode(HttpStatus.OK)
  activer(@Body() dto: ActiverDto, @Req() req: Request) {
    return this.activation.activer(dto.jeton, dto.nouveau, { ip: req.ip, userAgent: req.get('user-agent') });
  }
}
