import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isIP } from 'node:net';

// IIS/ARR transmet l'adresse du poste avec son port (« 10.1.2.3:54321 » ou
// « [fe80::1]:54321 ») : la colonne adresse_ip (inet) le refuserait.
export function normaliserIp(brute?: string | null): string | null {
  if (!brute) return null;
  let ip = brute.split(',')[0].trim();
  const v6 = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (v6) ip = v6[1];
  const v4 = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(ip);
  if (v4) ip = v4[1];
  ip = ip.replace(/^::ffff:/i, '');
  return isIP(ip) ? ip : null;
}

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
      const ip = normaliserIp(contexte.ip);
      const inserer = (adresse: string | null) => this.dataSource.query(
        `insert into journal_audit (utilisateur_id, organisation_id, objet_type, objet_id, nouvelle_valeur, adresse_ip, user_agent)
         values ($1, $2, 'securite', $1, $3, $4, $5)`,
        [
          contexte.utilisateurId ?? null,
          contexte.organisationId ?? null,
          JSON.stringify({ evenement, email: contexte.email ?? null, ...(contexte.details ?? {}) }),
          adresse,
          contexte.userAgent ? contexte.userAgent.slice(0, 300) : null,
        ],
      );
      try {
        await inserer(ip);
      } catch (err) {
        // Jamais perdre l'événement à cause de l'adresse : on l'enregistre sans.
        if (!ip) throw err;
        this.logger.warn(`Adresse IP refusée (${ip}) : ${(err as Error).message}`);
        await inserer(null);
      }
    } catch (err) {
      this.logger.error(`Journal de sécurité : ${(err as Error).message}`);
    }
  }
}
