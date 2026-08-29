import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UtilisateursService } from '../administration/utilisateurs/utilisateurs.service';
import type { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const utilisateur = await this.utilisateursService.findByEmailForAuth(email);

    // Message volontairement identique (email inconnu / mdp faux / hash absent
    // suite à une bascule bcrypt non encore faite) pour ne pas révéler quels
    // comptes existent.
    if (!utilisateur || !utilisateur.passwordHash) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const motDePasseValide = await bcrypt.compare(password, utilisateur.passwordHash);
    if (!motDePasseValide) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const payload: JwtPayload = {
      sub: utilisateur.id,
      email: utilisateur.email,
      organisationId: utilisateur.organisationId,
    };

    return { accessToken: await this.jwtService.signAsync(payload) };
  }
}
