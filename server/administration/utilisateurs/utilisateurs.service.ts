import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Utilisateur } from './entities/utilisateur.entity';
import { normaliserIp } from '../../auth/journal-securite.service';

export interface CreerUtilisateurInput {
  email: string;
  nom: string;
  prenom: string;
  entiteId?: string | null;
  fonctionId?: string | null;
  matricule?: string | null;
  telephone?: string | null;
}

// Reprend la contrainte de composition de l'ancienne Edge Function
// creer-utilisateur (au moins une majuscule/minuscule/chiffre/symbole).
function genererMotDePasseTemporaire(): string {
  const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minuscules = 'abcdefghjkmnpqrstuvwxyz';
  const chiffres = '23456789';
  const symboles = '!@#$%';
  const alphabet = majuscules + minuscules + chiffres + symboles;

  const tirer = (jeu: string) => jeu[randomInt(jeu.length)];
  let mot = tirer(majuscules) + tirer(minuscules) + tirer(chiffres) + tirer(symboles);
  for (let i = mot.length; i < 14; i++) mot += tirer(alphabet);
  return mot;
}

@Injectable()
export class UtilisateursService {
  constructor(
    @InjectRepository(Utilisateur)
    private readonly utilisateurs: Repository<Utilisateur>,
  ) {}

  // passwordHash a select:false par défaut (jamais renvoyé aux services métier) ;
  // seul AuthService en a besoin pour vérifier le mot de passe à la connexion.
  findByEmailForAuth(email: string): Promise<Utilisateur | null> {
    return this.utilisateurs
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .addSelect('u.echecsConnexion')
      .addSelect('u.jetonVersion')
      .where('lower(u.email) = lower(:email)', { email: email.trim() })
      .andWhere('u.statut = :statut', { statut: 'actif' })
      .getOne();
  }

  findById(id: string): Promise<Utilisateur | null> {
    return this.utilisateurs.findOneBy({ id });
  }

  findByOrganisation(organisationId: string): Promise<Utilisateur[]> {
    return this.utilisateurs.find({ where: { organisationId }, order: { nom: 'ASC' } });
  }

  async findOne(id: string): Promise<Utilisateur> {
    const utilisateur = await this.findById(id);
    if (!utilisateur) throw new NotFoundException('Utilisateur introuvable');
    return utilisateur;
  }

  async update(id: string, data: Partial<Utilisateur>): Promise<Utilisateur> {
    await this.findOne(id);
    await this.utilisateurs.update(id, data);
    return this.findOne(id);
  }

  // Remplace l'Edge Function creer-utilisateur (service_role + auth.admin.createUser) :
  // sans Supabase Auth, un simple INSERT suffit — le contrôle de permission
  // (utilisateurs/creer) est fait en amont par PermissionsGuard sur le controller.
  async creerUtilisateur(
    organisationId: string,
    input: CreerUtilisateurInput,
  ): Promise<{ id: string; email: string; motDePasseTemporaire: string }> {
    const existant = await this.utilisateurs.findOneBy({ email: input.email });
    if (existant) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const motDePasseTemporaire = genererMotDePasseTemporaire();
    const passwordHash = await bcrypt.hash(motDePasseTemporaire, 10);

    const utilisateur = this.utilisateurs.create({
      organisationId,
      entiteId: input.entiteId ?? null,
      fonctionId: input.fonctionId ?? null,
      matricule: input.matricule ?? null,
      telephone: input.telephone ?? null,
      nom: input.nom,
      prenom: input.prenom,
      email: input.email,
      passwordHash,
      doitChangerMotDePasse: true,
    });
    const cree = await this.utilisateurs.save(utilisateur);

    return { id: cree.id, email: cree.email, motDePasseTemporaire };
  }

  // v8.6.5 : réinitialisation par l'administrateur — nouveau mot de passe
  // temporaire (affiché une seule fois), à changer à la prochaine connexion ;
  // le verrouillage éventuel est levé.
  async reinitialiserMotDePasse(
    id: string,
    organisationId: string,
    auteur?: { id: string; ip?: string | null },
  ): Promise<{ email: string; motDePasseTemporaire: string }> {
    const utilisateur = await this.findOne(id);
    if (utilisateur.organisationId !== organisationId) throw new NotFoundException('Utilisateur introuvable');
    const motDePasseTemporaire = genererMotDePasseTemporaire();
    await this.utilisateurs.update(id, {
      passwordHash: await bcrypt.hash(motDePasseTemporaire, 12),
      doitChangerMotDePasse: true,
      echecsConnexion: 0,
      verrouilleJusqua: null,
    });
    await this.revoquerJetons(id);
    // v8.6.6 : trace dans le journal de sécurité (auteur = administrateur).
    await this.utilisateurs
      .query(
        `insert into journal_audit (utilisateur_id, organisation_id, objet_type, objet_id, nouvelle_valeur, adresse_ip)
         values ($1, $2, 'securite', $3, $4, $5)`,
        [
          auteur?.id ?? null,
          organisationId,
          id,
          JSON.stringify({ evenement: 'mot_de_passe_reinitialise', email: utilisateur.email }),
          normaliserIp(auteur?.ip),
        ],
      )
      .catch(() => undefined);
    return { email: utilisateur.email, motDePasseTemporaire };
  }

  findAvecMotDePasse(id: string): Promise<Utilisateur | null> {
    return this.utilisateurs
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .addSelect('u.echecsConnexion')
      .addSelect('u.jetonVersion')
      .where('u.id = :id', { id })
      .getOne();
  }

  async enregistrerEchecConnexion(id: string, seuil: number, dureeMinutes: number): Promise<boolean> {
    // Avec PostgreSQL, TypeORM renvoie [lignes, nombre] pour un UPDATE … RETURNING.
    const resultat: unknown = await this.utilisateurs.query(
      'update utilisateurs set echecs_connexion = echecs_connexion + 1 where id = $1 returning echecs_connexion',
      [id],
    );
    const lignes = (Array.isArray(resultat) && Array.isArray(resultat[0]) ? resultat[0] : resultat) as Array<{
      echecs_connexion: number;
    }>;
    const echecs = lignes[0]?.echecs_connexion ?? 0;
    if (echecs >= seuil) {
      await this.utilisateurs.query(
        `update utilisateurs set echecs_connexion = 0, verrouille_jusqua = now() + ($2 || ' minutes')::interval where id = $1`,
        [id, String(dureeMinutes)],
      );
      return true;
    }
    return false;
  }

  async connexionReussie(id: string): Promise<void> {
    await this.utilisateurs.query('update utilisateurs set echecs_connexion = 0, verrouille_jusqua = null where id = $1', [id]);
  }

  async definirMotDePasse(id: string, motDePasse: string): Promise<void> {
    await this.utilisateurs.update(id, {
      passwordHash: await bcrypt.hash(motDePasse, 12),
      doitChangerMotDePasse: false,
      motDePasseModifieLe: new Date(),
    });
    await this.revoquerJetons(id);
  }

  // v8.6.6 : invalide tous les jetons déjà émis pour ce compte.
  async revoquerJetons(id: string): Promise<void> {
    await this.utilisateurs.query('update utilisateurs set jeton_version = jeton_version + 1 where id = $1', [id]);
  }

  async versionJeton(id: string): Promise<number> {
    const rows: Array<{ jeton_version: number }> = await this.utilisateurs.query(
      'select jeton_version from utilisateurs where id = $1',
      [id],
    );
    return rows[0]?.jeton_version ?? 0;
  }
}
