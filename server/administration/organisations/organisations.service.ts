import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { encrypt } from '../../common/crypto/encryption.util';
import { getStorageRoot } from '../../config/storage.config';
import { Organisation } from './entities/organisation.entity';
import { ParametreOrganisation } from './entities/parametre-organisation.entity';
import { ParametreSmtp } from './entities/parametre-smtp.entity';

export interface FichierEntrant {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}

@Injectable()
export class OrganisationsService {
  private readonly storageRoot = getStorageRoot();

  constructor(
    @InjectRepository(Organisation) private readonly organisations: Repository<Organisation>,
    @InjectRepository(ParametreOrganisation) private readonly parametres: Repository<ParametreOrganisation>,
    @InjectRepository(ParametreSmtp) private readonly parametresSmtp: Repository<ParametreSmtp>,
  ) {}

  findAll(): Promise<Organisation[]> {
    return this.organisations.find({ order: { nom: 'ASC' } });
  }

  // Portage de la vue publique organisation_branding (0064) : uniquement les
  // colonnes destinées à un accès non authentifié (page de connexion).
  async getBranding(): Promise<Pick<Organisation, 'id' | 'nom' | 'logoUrl' | 'couleurPrimaire'> | null> {
    const organisation = await this.organisations.findOne({
      where: { actif: true },
      order: { createdAt: 'ASC' },
      select: { id: true, nom: true, logoUrl: true, couleurPrimaire: true },
    });
    return organisation ?? null;
  }

  async findOne(id: string): Promise<Organisation> {
    const organisation = await this.organisations.findOneBy({ id });
    if (!organisation) throw new NotFoundException('Organisation introuvable');
    return organisation;
  }

  create(data: Partial<Organisation>): Promise<Organisation> {
    return this.organisations.save(this.organisations.create(data));
  }

  async update(id: string, data: Partial<Organisation>): Promise<Organisation> {
    await this.findOne(id);
    await this.organisations.update(id, data);
    return this.findOne(id);
  }

  // Paramétrage clé/valeur (public.parametres_organisation) ---------------

  listParametres(organisationId: string): Promise<ParametreOrganisation[]> {
    return this.parametres.findBy({ organisationId });
  }

  // Retour non typé : la colonne jsonb `valeur` peut porter un scalaire (ex. un
  // uuid en chaîne) aussi bien qu'un objet — à l'appelant de vérifier la forme
  // attendue pour la clé qu'il lit.
  async getParametre(organisationId: string, cle: string): Promise<unknown> {
    const parametre = await this.parametres.findOneBy({ organisationId, cle });
    return parametre?.valeur ?? null;
  }

  // La colonne jsonb `valeur` (Record<string, unknown>) fait buter le typage
  // DeepPartial de TypeORM sur update()/create() (limitation connue avec les
  // index signatures) — cast ciblé, sans rapport avec la validité des données.
  async definirParametre(organisationId: string, cle: string, valeur: unknown, description?: string) {
    const existant = await this.parametres.findOneBy({ organisationId, cle });
    if (existant) {
      await this.parametres.update(existant.id, {
        valeur,
        description: description ?? existant.description,
      } as Parameters<typeof this.parametres.update>[1]);
      return this.parametres.findOneBy({ id: existant.id });
    }
    return this.parametres.save(this.parametres.create({ organisationId, cle, valeur, description } as Parameters<typeof this.parametres.create>[0]));
  }

  async deleteParametre(id: string): Promise<void> {
    await this.parametres.delete(id);
  }

  // Logo d'organisation : plus de bucket public Supabase Storage — un seul
  // fichier par organisation sur disque (écrasé à chaque upload, ancien(s)
  // fichier(s) d'extension différente nettoyés), servi par un endpoint public
  // dédié (voir OrganisationsController.getLogo) puisque logoUrl doit rester
  // visible sans authentification (page de connexion).
  async uploadLogo(organisationId: string, fichier: FichierEntrant): Promise<string> {
    await this.findOne(organisationId);
    const dossier = path.resolve(this.storageRoot, 'organisations', organisationId);
    await fs.mkdir(dossier, { recursive: true });
    const anciens = await fs.readdir(dossier).catch(() => [] as string[]);
    await Promise.all(
      anciens.filter((f) => f.startsWith('logo.')).map((f) => fs.unlink(path.join(dossier, f)).catch(() => undefined)),
    );

    const extension = this.extensionSuivant(fichier.originalname, fichier.mimetype);
    await fs.writeFile(path.join(dossier, `logo${extension}`), fichier.buffer);

    const logoUrl = `/api/administration/organisations/${organisationId}/logo?v=${randomUUID()}`;
    await this.organisations.update(organisationId, { logoUrl });
    return logoUrl;
  }

  async resoudreLogo(organisationId: string): Promise<{ cheminAbsolu: string; typeMime: string } | null> {
    const dossier = path.resolve(this.storageRoot, 'organisations', organisationId);
    const fichiers = await fs.readdir(dossier).catch(() => [] as string[]);
    const logo = fichiers.find((f) => f.startsWith('logo.'));
    if (!logo) return null;
    return { cheminAbsolu: path.join(dossier, logo), typeMime: this.typeMime(path.extname(logo)) };
  }

  private extensionSuivant(nomOriginal: string, mimetype: string): string {
    const parType: Record<string, string> = {
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/svg+xml': '.svg',
      'image/webp': '.webp',
    };
    if (parType[mimetype]) return parType[mimetype];
    const ext = path.extname(nomOriginal).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.svg', '.webp'].includes(ext)) return ext === '.jpeg' ? '.jpg' : ext;
    throw new BadRequestException('Format de logo non supporté (png, jpg, svg, webp)');
  }

  private typeMime(extension: string): string {
    const map: Record<string, string> = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
    };
    return map[extension] ?? 'application/octet-stream';
  }

  // Paramètres SMTP (public.parametres_smtp) — mot_de_passe jamais renvoyé -

  async getParametresSmtp(organisationId: string): Promise<ParametreSmtp | null> {
    return this.parametresSmtp.findOneBy({ organisationId });
  }

  async definirParametresSmtp(
    organisationId: string,
    data: {
      hote: string;
      port: number;
      securite: string;
      utilisateur: string;
      motDePasse?: string;
      adresseExpediteur: string;
      nomExpediteur?: string | null;
      actif?: boolean;
    },
  ): Promise<void> {
    const existant = await this.parametresSmtp.findOneBy({ organisationId });
    // Chiffré (réversible), pas hashé : le serveur SMTP a besoin du mot de passe
    // en clair pour s'authentifier — voir server/common/crypto/encryption.util.ts.
    const motDePasseChiffre = data.motDePasse ? encrypt(data.motDePasse) : undefined;

    if (existant) {
      await this.parametresSmtp.update(existant.id, {
        hote: data.hote,
        port: data.port,
        securite: data.securite,
        utilisateur: data.utilisateur,
        adresseExpediteur: data.adresseExpediteur,
        nomExpediteur: data.nomExpediteur ?? null,
        ...(data.actif !== undefined ? { actif: data.actif } : {}),
        ...(motDePasseChiffre ? { motDePasse: motDePasseChiffre } : {}),
      });
      return;
    }

    if (!motDePasseChiffre) {
      throw new NotFoundException('Mot de passe SMTP requis pour la première configuration');
    }
    await this.parametresSmtp.save(
      this.parametresSmtp.create({
        organisationId,
        hote: data.hote,
        port: data.port,
        securite: data.securite,
        utilisateur: data.utilisateur,
        motDePasse: motDePasseChiffre,
        adresseExpediteur: data.adresseExpediteur,
        nomExpediteur: data.nomExpediteur ?? null,
        actif: data.actif ?? true,
      }),
    );
  }
}
