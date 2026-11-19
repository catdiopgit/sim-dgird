import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export type EvenementSecurite =
  | 'connexion_reussie'
  | 'connexion_echouee'
  | 'compte_verrouille'
  | 'tentatives_excessives'
  | 'mot_de_passe_change'
  | 'mot_de_passe_reinitialise'
  | 'deconnexion';

// v8.6.6 — journal des événements de sécurité dans journal_audit (visible
// dans Administration → Audit, type « securite »). Jamais de mot de passe.
@Injectable()
export class JournalSecuriteService {
  private readonly logger = new Logger(JournalSecuriteService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async enregistrer(
    evenement: EvenementSecurite,
    contexte: {
      utilisateurId?: string | null;
      organisationId?: string | null;
      email?: string | null;
      ip?: string | null;
      userAgent?: string | null;
      details?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      const ip = contexte.ip && /^[0-9a-f.:]+$/i.test(contexte.ip.replace(/^::ffff:/, '')) ? contexte.ip.replace(/^::ffff:/, '') : null;
      await this.dataSource.query(
        `insert into journal_audit (utilisateur_id, organisation_id, objet_type, objet_id, nouvelle_valeur, adresse_ip, user_agent)
         values ($1, $2, 'securite', $1, $3, $4, $5)`,
        [
          contexte.utilisateurId ?? null,
          contexte.organisationId ?? null,
          JSON.stringify({ evenement, email: contexte.email ?? null, ...(contexte.details ?? {}) }),
          ip,
          contexte.userAgent ? contexte.userAgent.slice(0, 300) : null,
        ],
      );
    } catch (err) {
      this.logger.error(`Journal de sécurité : ${(err as Error).message}`);
    }
  }
}
