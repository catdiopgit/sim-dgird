import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import nodemailer from 'nodemailer';
import { decrypt } from '../common/crypto/encryption.util';
import { ParametreSmtp } from '../administration/organisations/entities/parametre-smtp.entity';

interface NotificationEnAttente {
  id: string;
  destinataire_id: string;
  titre: string;
  message: string | null;
  email: string;
  organisation_id: string;
  lien_url: string | null;
  objet_module: string | null;
  objet_id: string | null;
}

// v8.5.5 : seules les notifications récentes partent par e-mail. Sans cette
// limite, la première configuration du SMTP enverrait d'un coup tout
// l'historique (recette comprise). Les plus anciennes restent visibles dans la
// cloche de l'application.
const FENETRE_ENVOI_HEURES = 48;

// Portage de l'Edge Function `envoyer-notifications-email` (cron 5 min externe) :
// lit les notifications en attente (envoye_le is null), les envoie via le compte SMTP
// de l'organisation du destinataire (public.parametres_smtp, mot de passe déchiffré —
// voir server/common/crypto/encryption.util.ts), marque envoye_le. Une organisation
// sans SMTP actif configuré est simplement ignorée (les notifications restent en
// attente, reprises automatiquement dès qu'un SMTP est configuré) — même comportement
// que l'origine.
@Injectable()
export class EmailNotificationsService {
  private readonly logger = new Logger(EmailNotificationsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ParametreSmtp) private readonly parametresSmtp: Repository<ParametreSmtp>,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async envoyerEmailsCron(): Promise<void> {
    const resultat = await this.envoyerEmailsEnAttente();
    if (resultat.envoyees > 0 || resultat.echouees > 0) {
      this.logger.log(`Emails : ${resultat.envoyees} envoyé(s), ${resultat.echouees} échoué(s), ${resultat.enAttente} en attente`);
    }
  }

  async envoyerEmailsEnAttente(): Promise<{ envoyees: number; echouees: number; enAttente: number }> {
    const notifications: NotificationEnAttente[] = await this.dataSource.query(
      `select n.id, n.destinataire_id, n.titre, n.message, u.email, u.organisation_id,
              n.lien_url, n.objet_module, n.objet_id
       from notifications n
       join utilisateurs u on u.id = n.destinataire_id
       where n.envoye_le is null and u.email is not null
         and n.created_at > now() - make_interval(hours => ${FENETRE_ENVOI_HEURES})
       order by n.created_at asc
       limit 200`,
    );

    const parOrganisation = new Map<string, NotificationEnAttente[]>();
    for (const n of notifications) {
      const liste = parOrganisation.get(n.organisation_id) ?? [];
      liste.push(n);
      parOrganisation.set(n.organisation_id, liste);
    }

    let envoyees = 0;
    let echouees = 0;
    const idsEnvoyes: string[] = [];

    for (const [organisationId, lignes] of parOrganisation) {
      const urlApp = await this.urlApplication(organisationId);
      const smtp = await this.parametresSmtp
        .createQueryBuilder('s')
        .addSelect('s.motDePasse')
        .where('s.organisationId = :organisationId', { organisationId })
        .getOne();

      if (!smtp || !smtp.actif || !smtp.motDePasse) continue;

      const transporteur = nodemailer.createTransport({
        host: smtp.hote,
        port: smtp.port,
        secure: smtp.securite === 'ssl',
        auth: { user: smtp.utilisateur, pass: decrypt(smtp.motDePasse) },
      });

      for (const n of lignes) {
        try {
          await transporteur.sendMail({
            from: smtp.nomExpediteur ? `${smtp.nomExpediteur} <${smtp.adresseExpediteur}>` : smtp.adresseExpediteur,
            to: n.email,
            subject: n.titre,
            text: this.corps(n, urlApp),
          });
          idsEnvoyes.push(n.id);
          envoyees++;
        } catch (err) {
          echouees++;
          this.logger.error(`Échec envoi notification ${n.id} à ${n.email}`, err instanceof Error ? err.stack : err);
        }
      }

      transporteur.close();
    }

    if (idsEnvoyes.length > 0) {
      await this.dataSource.query('update notifications set envoye_le = now() where id = any($1::uuid[])', [idsEnvoyes]);
    }

    return { envoyees, echouees, enAttente: notifications.length - envoyees - echouees };
  }

  // Lien vers l'écran concerné, si l'adresse de l'application est connue
  // (enregistrée lors du premier e-mail de test, voir envoyerTest).
  private corps(n: NotificationEnAttente, urlApp: string | null): string {
    const texte = n.message ?? n.titre;
    const chemin =
      n.lien_url ??
      (n.objet_id && n.objet_module === 'courrier'
        ? `/courriers/${n.objet_id}`
        : n.objet_id && n.objet_module === 'projets'
          ? `/projets/${n.objet_id}`
          : n.objet_id && n.objet_module === 'marches'
            ? `/marches/${n.objet_id}`
            : null);
    const lien = urlApp && chemin ? `\n\nOuvrir dans le SIM : ${urlApp}${chemin}` : '';
    return `${texte}${lien}\n\n—\nMessage automatique du SIM, merci de ne pas y répondre.`;
  }

  async urlApplication(organisationId: string): Promise<string | null> {
    const rows: Array<{ url: string | null }> = await this.dataSource.query(
      `select valeur->>'url' as url from parametres_organisation where organisation_id = $1 and cle = 'url_application' limit 1`,
      [organisationId],
    );
    return rows[0]?.url ?? null;
  }

  // E-mail de test immédiat (bouton du paramétrage SMTP) : renvoie l'erreur
  // exacte du serveur de messagerie pour faciliter le diagnostic. Mémorise au
  // passage l'adresse de l'application, utilisée pour les liens des e-mails.
  async envoyerTest(
    organisationId: string,
    destinataire: { email: string; nom: string },
    urlApp: string | null,
  ): Promise<{ ok: boolean; message: string }> {
    if (urlApp && /^https?:\/\/[^\s/]+$/.test(urlApp)) {
      await this.dataSource.query(
        `insert into parametres_organisation (organisation_id, cle, valeur)
         values ($1, 'url_application', jsonb_build_object('url', $2::text))
         on conflict (organisation_id, cle) do update set valeur = excluded.valeur`,
        [organisationId, urlApp],
      );
    }
    const smtp = await this.parametresSmtp
      .createQueryBuilder('s')
      .addSelect('s.motDePasse')
      .where('s.organisationId = :organisationId', { organisationId })
      .getOne();
    if (!smtp || !smtp.motDePasse) return { ok: false, message: 'Aucun compte SMTP enregistré (mot de passe compris).' };
    const transporteur = nodemailer.createTransport({
      host: smtp.hote,
      port: smtp.port,
      secure: smtp.securite === 'ssl',
      auth: { user: smtp.utilisateur, pass: decrypt(smtp.motDePasse) },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    try {
      await transporteur.sendMail({
        from: smtp.nomExpediteur ? `${smtp.nomExpediteur} <${smtp.adresseExpediteur}>` : smtp.adresseExpediteur,
        to: destinataire.email,
        subject: 'SIM — e-mail de test',
        text: `Bonjour ${destinataire.nom},\n\nCet e-mail confirme que le SIM peut envoyer ses notifications.${urlApp ? `\n\nOuvrir le SIM : ${urlApp}` : ''}${smtp.actif ? '' : "\n\nAttention : l'envoi automatique est désactivé (case « Actif » non cochée)."}`,
      });
      return { ok: true, message: `E-mail de test envoyé à ${destinataire.email}.${smtp.actif ? '' : ' Les notifications ne partiront qu’une fois le compte activé.'}` };
    } catch (err) {
      return { ok: false, message: `Échec de l'envoi : ${(err as Error).message}` };
    } finally {
      transporteur.close();
    }
  }

  // v8.6.9 — envoi immédiat d'un message (lien d'activation…). Renvoie un motif
  // lisible si l'envoi est impossible (compte SMTP absent, inactif ou réseau).
  async envoyerMessage(
    organisationId: string,
    message: { to: string; subject: string; text: string },
  ): Promise<{ ok: boolean; message: string }> {
    const smtp = await this.parametresSmtp
      .createQueryBuilder('s')
      .addSelect('s.motDePasse')
      .where('s.organisationId = :organisationId', { organisationId })
      .getOne();
    if (!smtp || !smtp.motDePasse) return { ok: false, message: "L'envoi d'e-mails n'est pas configuré (Administration → Paramétrage → Messagerie)." };
    if (!smtp.actif) return { ok: false, message: "L'envoi d'e-mails n'est pas encore activé (case « Actif » du paramétrage de messagerie)." };
    const transporteur = nodemailer.createTransport({
      host: smtp.hote,
      port: smtp.port,
      secure: smtp.securite === 'ssl',
      auth: { user: smtp.utilisateur, pass: decrypt(smtp.motDePasse) },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
    });
    try {
      await transporteur.sendMail({
        from: smtp.nomExpediteur ? `${smtp.nomExpediteur} <${smtp.adresseExpediteur}>` : smtp.adresseExpediteur,
        ...message,
      });
      return { ok: true, message: `E-mail envoyé à ${message.to}.` };
    } catch (err) {
      return { ok: false, message: `Le serveur de messagerie est injoignable ou a refusé l'envoi (${(err as Error).message}).` };
    } finally {
      transporteur.close();
    }
  }
}
