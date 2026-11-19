import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { UtilisateursService } from '../administration/utilisateurs/utilisateurs.service';
import { EmailNotificationsService } from '../notifications/email-notifications.service';
import { JournalSecuriteService } from './journal-securite.service';
import { controlerMotDePasse } from './auth.service';

const DUREE_HEURES = 48;
const hacher = (jeton: string) => createHash('sha256').update(jeton).digest('hex');

type Ctx = { ip?: string | null; userAgent?: string | null };

// v8.6.9 — lien d'activation à usage unique : l'agent choisit lui-même son mot
// de passe, aucun mot de passe ne circule par e-mail. Seule l'empreinte SHA-256
// du jeton est stockée ; le lien expire au bout de 48 h.
@Injectable()
export class ActivationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly utilisateurs: UtilisateursService,
    private readonly emails: EmailNotificationsService,
    private readonly journal: JournalSecuriteService,
  ) {}

  async envoyer(
    id: string,
    auteur: { id: string; organisationId: string },
    origine: string | null,
    ctx: Ctx,
  ): Promise<{ ok: true; message: string }> {
    const u = await this.utilisateurs.findOne(id);
    if (u.organisationId !== auteur.organisationId) throw new NotFoundException('Utilisateur introuvable');
    if (u.statut !== 'actif') throw new BadRequestException("Ce compte n'est pas actif : réactivez-le avant d'envoyer un lien.");
    const base = (await this.emails.urlApplication(u.organisationId)) ?? origine;
    if (!base) throw new BadRequestException("L'adresse de l'application n'est pas connue (paramétrage de messagerie).");
    const jeton = randomBytes(32).toString('base64url');
    await this.dataSource.query(
      `update utilisateurs set jeton_activation_hash = $2, jeton_activation_expire = now() + interval '${DUREE_HEURES} hours' where id = $1`,
      [id, hacher(jeton)],
    );
    const lien = `${base.replace(/\/$/, '')}/activation?jeton=${jeton}`;
    const envoi = await this.emails.envoyerMessage(u.organisationId, {
      to: u.email,
      subject: 'SIM-DGIRD — Activez votre compte',
      text:
        `Bonjour ${u.prenom} ${u.nom},\n\n` +
        `Un compte a été ouvert pour vous dans le SIM-DGIRD.\n` +
        `Votre identifiant de connexion est : ${u.email}\n\n` +
        `Pour choisir votre mot de passe et activer votre compte, ouvrez ce lien (valable ${DUREE_HEURES} heures, utilisable une seule fois) :\n${lien}\n\n` +
        `Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et prévenez l'administrateur du SIM.\n\n` +
        `—\nMessage automatique du SIM, merci de ne pas y répondre.`,
    });
    if (!envoi.ok) {
      await this.dataSource.query('update utilisateurs set jeton_activation_hash = null, jeton_activation_expire = null where id = $1', [id]);
      throw new ServiceUnavailableException(envoi.message);
    }
    await this.journal.enregistrer('lien_activation_envoye', {
      utilisateurId: auteur.id,
      organisationId: u.organisationId,
      email: u.email,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { ok: true, message: `Lien d'activation envoyé à ${u.email} (valable ${DUREE_HEURES} h).` };
  }

  private async trouver(jeton: string) {
    if (!jeton || jeton.length < 20 || jeton.length > 100) throw new BadRequestException('Lien invalide');
    const rows: Array<{ id: string; email: string; prenom: string; nom: string; organisation_id: string; statut: string; expire: Date }> =
      await this.dataSource.query(
        `select id, email, prenom, nom, organisation_id, statut, jeton_activation_expire as expire
           from utilisateurs where jeton_activation_hash = $1`,
        [hacher(jeton)],
      );
    const u = rows[0];
    if (!u || u.statut !== 'actif') throw new BadRequestException("Ce lien n'est plus valable. Demandez un nouveau lien à l'administrateur.");
    if (new Date(u.expire).getTime() < Date.now()) throw new BadRequestException("Ce lien a expiré. Demandez un nouveau lien à l'administrateur.");
    return u;
  }

  async verifier(jeton: string): Promise<{ email: string; prenom: string }> {
    const u = await this.trouver(jeton);
    return { email: u.email, prenom: u.prenom };
  }

  async activer(jeton: string, nouveau: string, ctx: Ctx): Promise<{ ok: true; email: string }> {
    const u = await this.trouver(jeton);
    controlerMotDePasse(nouveau, u.email);
    await this.utilisateurs.definirMotDePasse(u.id, nouveau);
    await this.dataSource.query(
      'update utilisateurs set jeton_activation_hash = null, jeton_activation_expire = null, echecs_connexion = 0, verrouille_jusqua = null where id = $1',
      [u.id],
    );
    await this.journal.enregistrer('compte_active', { utilisateurId: u.id, organisationId: u.organisation_id, email: u.email, ip: ctx.ip, userAgent: ctx.userAgent });
    return { ok: true, email: u.email };
  }
}
