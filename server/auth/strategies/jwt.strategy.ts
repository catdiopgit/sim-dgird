import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UtilisateursService } from '../../administration/utilisateurs/utilisateurs.service';

export interface JwtPayload {
  sub: string;
  email: string;
  organisationId: string;
  // v8.6.6 : version du jeton (révocation à la déconnexion / changement de mot de passe).
  ver?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  organisationId: string;
  entiteId: string | null;
  doitChangerMotDePasse?: boolean;
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
    if ((payload.ver ?? 0) !== (await this.utilisateursService.versionJeton(utilisateur.id))) {
      throw new UnauthorizedException('Session expirée : veuillez vous reconnecter');
    }
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      organisationId: utilisateur.organisationId,
      entiteId: utilisateur.entiteId,
      doitChangerMotDePasse: utilisateur.doitChangerMotDePasse,
    };
  }
}
