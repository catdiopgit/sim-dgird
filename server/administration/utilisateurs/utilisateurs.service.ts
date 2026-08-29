import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { Utilisateur } from './entities/utilisateur.entity';

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
      .where('u.email = :email', { email })
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
    });
    const cree = await this.utilisateurs.save(utilisateur);

    return { id: cree.id, email: cree.email, motDePasseTemporaire };
  }
}
