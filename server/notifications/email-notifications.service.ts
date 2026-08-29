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
}

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
      `select n.id, n.destinataire_id, n.titre, n.message, u.email, u.organisation_id
       from notifications n
       join utilisateurs u on u.id = n.destinataire_id
       where n.envoye_le is null
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
            text: n.message ?? n.titre,
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
}
