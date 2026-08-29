import { ForbiddenException, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import { AuthorizationService } from './authorization.service';
import { PERMISSION_KEY, type RequirePermissionOptions } from './require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequirePermissionOptions | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    if (!user) throw new UnauthorizedException();

    const entiteId = required.entiteIdParam
      ? (request.params?.[required.entiteIdParam] ??
        request.body?.[required.entiteIdParam] ??
        request.query?.[required.entiteIdParam] ??
        null)
      : null;

    const autorise = await this.authorizationService.hasPermission(user.id, required.module, required.action, entiteId);
    if (!autorise) {
      throw new ForbiddenException(`Permission refusée (${required.module}/${required.action})`);
    }
    return true;
  }
}
