import { ForbiddenException, Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  // v8.6.5 : tant que l'utilisateur doit changer son mot de passe, seules
  // les routes de profil et de changement de mot de passe sont ouvertes.
  handleRequest<TUser>(err: unknown, user: TUser, info: unknown, context: ExecutionContext): TUser {
    const resultat = super.handleRequest(err, user, info, context) as TUser;
    const u = resultat as { doitChangerMotDePasse?: boolean } | undefined;
    if (u?.doitChangerMotDePasse) {
      const req = context.switchToHttp().getRequest<{ path?: string; url?: string }>();
      const chemin = (req.path ?? req.url ?? '').split('?')[0];
      const ouvertes = ['/api/auth/me', '/api/auth/mot-de-passe', '/api/administration/organisations/branding'];
      if (!ouvertes.some((o) => chemin === o || chemin.endsWith(o.replace('/api', '')))) {
        throw new ForbiddenException('Vous devez changer votre mot de passe avant de continuer');
      }
    }
    return resultat;
  }
}
