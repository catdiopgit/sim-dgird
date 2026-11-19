import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UtilisateursService } from '../administration/utilisateurs/utilisateurs.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import { JournalSecuriteService } from './journal-securite.service';

export interface ContexteConnexion {
  ip?: string | null;
  userAgent?: string | null;
}

// v8.6.5 — protection contre les essais de mots de passe :
//  - par poste (adresse IP) : 10 tentatives par tranche de 5 minutes ;
//  - par compte : verrouillage 15 minutes après 10 échecs consécutifs.
const ESSAIS_PAR_IP = 10;
const FENETRE_IP_MS = 5 * 60 * 1000;
const ECHECS_AVANT_VERROU = 10;
const DUREE_VERROU_MIN = 15;

export const REGLE_MOT_DE_PASSE =
  'Au moins 10 caractères, avec au moins une lettre et un chiffre, différent du mot de passe actuel et de votre adresse e-mail.';

export function controlerMotDePasse(nouveau: string, email: string): void {
  if (
    nouveau.length < 10 ||
    !/[A-Za-zÀ-ÿ]/.test(nouveau) ||
    !/\d/.test(nouveau) ||
    nouveau.toLowerCase() === email.toLowerCase()
  ) {
    throw new BadRequestException(`Mot de passe trop faible. ${REGLE_MOT_DE_PASSE}`);
  }
}

@Injectable()
export class AuthService {
  private readonly essaisParIp = new Map<string, number[]>();

  constructor(
    private readonly utilisateursService: UtilisateursService,
    private readonly jwtService: JwtService,
    private readonly journal: JournalSecuriteService,
  ) {}

  private async emettreJeton(u: { id: string; email: string; organisationId: string }): Promise<string> {
    const payload: JwtPayload = {
      sub: u.id,
      email: u.email,
      organisationId: u.organisationId,
      ver: await this.utilisateursService.versionJeton(u.id),
    };
    return this.jwtService.signAsync(payload);
  }

  private limiterIp(ip: string, ctx: ContexteConnexion, email: string): void {
    const maintenant = Date.now();
    const recents = (this.essaisParIp.get(ip) ?? []).filter((t) => maintenant - t < FENETRE_IP_MS);
    if (recents.length >= ESSAIS_PAR_IP) {
      this.essaisParIp.set(ip, recents);
      if (recents.length === ESSAIS_PAR_IP) {
        recents.push(maintenant);
        void this.journal.enregistrer('tentatives_excessives', { email, ip: ctx.ip, userAgent: ctx.userAgent });
      }
      throw new HttpException(
        'Trop de tentatives de connexion depuis ce poste. Réessayez dans quelques minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recents.push(maintenant);
    this.essaisParIp.set(ip, recents);
    // Ménage occasionnel pour ne pas garder d'anciennes adresses en mémoire.
    if (this.essaisParIp.size > 5000) {
      for (const [cle, t] of this.essaisParIp) {
        if (!t.some((x) => maintenant - x < FENETRE_IP_MS)) this.essaisParIp.delete(cle);
      }
    }
  }

  async login(
    email: string,
    password: string,
    ctx: ContexteConnexion = {},
  ): Promise<{ accessToken: string; doitChangerMotDePasse: boolean }> {
    this.limiterIp(ctx.ip ?? 'inconnue', ctx, email);
    const utilisateur = await this.utilisateursService.findByEmailForAuth(email);
    const trace = { email, ip: ctx.ip, userAgent: ctx.userAgent };

    // Message volontairement identique (email inconnu / mdp faux / hash absent)
    // pour ne pas révéler quels comptes existent.
    if (!utilisateur || !utilisateur.passwordHash) {
      await this.journal.enregistrer('connexion_echouee', { ...trace, details: { motif: 'compte inconnu' } });
      throw new UnauthorizedException('Identifiants invalides');
    }
    const traceCompte = { ...trace, utilisateurId: utilisateur.id, organisationId: utilisateur.organisationId };
    if (utilisateur.statut !== 'actif') {
      await this.journal.enregistrer('connexion_echouee', { ...traceCompte, details: { motif: 'compte inactif' } });
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (utilisateur.verrouilleJusqua && utilisateur.verrouilleJusqua.getTime() > Date.now()) {
      await this.journal.enregistrer('connexion_echouee', { ...traceCompte, details: { motif: 'compte verrouillé' } });
      throw new UnauthorizedException(
        `Trop d'échecs sur ce compte : réessayez dans ${DUREE_VERROU_MIN} minutes ou demandez une réinitialisation à l'administrateur.`,
      );
    }

    const motDePasseValide = await bcrypt.compare(password, utilisateur.passwordHash);
    if (!motDePasseValide) {
      const verrouille = await this.utilisateursService.enregistrerEchecConnexion(
        utilisateur.id,
        ECHECS_AVANT_VERROU,
        DUREE_VERROU_MIN,
      );
      await this.journal.enregistrer(verrouille ? 'compte_verrouille' : 'connexion_echouee', {
        ...traceCompte,
        details: { motif: 'mot de passe incorrect' },
      });
      throw new UnauthorizedException(
        verrouille
          ? `Trop d'échecs sur ce compte : réessayez dans ${DUREE_VERROU_MIN} minutes ou demandez une réinitialisation à l'administrateur.`
          : 'Identifiants invalides',
      );
    }
    await this.utilisateursService.connexionReussie(utilisateur.id);
    await this.journal.enregistrer('connexion_reussie', traceCompte);
    return {
      accessToken: await this.emettreJeton(utilisateur),
      doitChangerMotDePasse: utilisateur.doitChangerMotDePasse,
    };
  }

  // v8.6.6 : déconnexion = le jeton en cours (et tous les autres jetons du
  // compte) ne sont plus acceptés.
  async deconnexion(user: { id: string; email: string; organisationId: string }, ctx: ContexteConnexion = {}): Promise<{ ok: true }> {
    await this.utilisateursService.revoquerJetons(user.id);
    await this.journal.enregistrer('deconnexion', {
      utilisateurId: user.id,
      organisationId: user.organisationId,
      email: user.email,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { ok: true };
  }

  async changerMotDePasse(
    userId: string,
    actuel: string,
    nouveau: string,
    ctx: ContexteConnexion = {},
  ): Promise<{ ok: true; accessToken: string }> {
    const utilisateur = await this.utilisateursService.findAvecMotDePasse(userId);
    if (!utilisateur?.passwordHash || !(await bcrypt.compare(actuel, utilisateur.passwordHash))) {
      throw new BadRequestException('Le mot de passe actuel est incorrect');
    }
    controlerMotDePasse(nouveau, utilisateur.email);
    if (await bcrypt.compare(nouveau, utilisateur.passwordHash)) {
      throw new BadRequestException(`Mot de passe trop faible. ${REGLE_MOT_DE_PASSE}`);
    }
    await this.utilisateursService.definirMotDePasse(userId, nouveau);
    await this.journal.enregistrer('mot_de_passe_change', {
      utilisateurId: userId,
      organisationId: utilisateur.organisationId,
      email: utilisateur.email,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    // Les anciens jetons sont révoqués : un nouveau jeton est remis.
    return { ok: true, accessToken: await this.emettreJeton(utilisateur) };
  }
}
