import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UtilisateursService } from '../../administration/utilisateurs/utilisateurs.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organisationId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  organisationId: string;
  entiteId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly utilisateursService: UtilisateursService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const utilisateur = await this.utilisateursService.findById(payload.sub);
    if (!utilisateur || utilisateur.statut !== 'actif') {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif');
    }
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      organisationId: utilisateur.organisationId,
      entiteId: utilisateur.entiteId,
    };
  }
}
