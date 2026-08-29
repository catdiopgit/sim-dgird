import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowDefinitionAssociation } from './entities/workflow-definition-association.entity';
import { WorkflowEtape } from './entities/workflow-etape.entity';
import { WorkflowTransition } from './entities/workflow-transition.entity';
import { WorkflowTransitionActeur } from './entities/workflow-transition-acteur.entity';

// CRUD du référentiel de workflow (définitions/étapes/transitions/acteurs/associations),
// portage des tables gérées jusqu'ici via supabase-js + RLS (0014_rls_core.sql) par
// l'admin UI (src/services/administration/workflows.ts). Lecture ouverte à tout membre
// de l'organisation (pas de vérif de permission côté SQL d'origine) mais alignée ici sur
// la convention déjà établie en Phase 1 (administration/consulter), comme pour
// organisations/entites/fonctions.
@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(WorkflowDefinition) private readonly definitions: Repository<WorkflowDefinition>,
    @InjectRepository(WorkflowEtape) private readonly etapes: Repository<WorkflowEtape>,
    @InjectRepository(WorkflowTransition) private readonly transitions: Repository<WorkflowTransition>,
    @InjectRepository(WorkflowTransitionActeur) private readonly acteurs: Repository<WorkflowTransitionActeur>,
    @InjectRepository(WorkflowDefinitionAssociation) private readonly associations: Repository<WorkflowDefinitionAssociation>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // --- Définitions ---

  findDefinitions(organisationId: string, moduleId?: string): Promise<WorkflowDefinition[]> {
    return this.definitions.find({
      where: { organisationId, ...(moduleId ? { moduleId } : {}) },
      order: { code: 'ASC' },
    });
  }

  async findDefinition(id: string): Promise<WorkflowDefinition> {
    const definition = await this.definitions.findOneBy({ id });
    if (!definition) throw new NotFoundException('Workflow introuvable');
    return definition;
  }

  createDefinition(data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    return this.definitions.save(this.definitions.create(data));
  }

  async updateDefinition(id: string, data: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    await this.findDefinition(id);
    await this.definitions.update(id, data);
    return this.findDefinition(id);
  }

  async removeDefinition(id: string): Promise<void> {
    await this.findDefinition(id);
    await this.definitions.delete(id);
  }

  // Bascule atomique de est_defaut (portage de app.fn_definir_workflow_defaut, 0045) :
  // désactive l'ancien défaut du même (organisation, module) avant d'activer le nouveau,
  // pour ne jamais violer idx_workflow_definitions_defaut.
  async definirDefaut(id: string, organisationId: string): Promise<WorkflowDefinition> {
    const definition = await this.findDefinition(id);
    if (definition.organisationId !== organisationId) {
      throw new BadRequestException('Ce workflow n\'appartient pas à votre organisation');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(WorkflowDefinition)
        .set({ estDefaut: false })
        .where('organisation_id = :organisationId and module_id = :moduleId and id != :id', {
          organisationId: definition.organisationId,
          moduleId: definition.moduleId,
          id,
        })
        .execute();
      await manager.update(WorkflowDefinition, id, { estDefaut: true });
    });
    return this.findDefinition(id);
  }

  // --- Étapes ---

  findEtapes(workflowDefinitionId: string): Promise<WorkflowEtape[]> {
    return this.etapes.find({ where: { workflowDefinitionId }, order: { ordre: 'ASC' } });
  }

  createEtape(data: Partial<WorkflowEtape>): Promise<WorkflowEtape> {
    return this.etapes.save(this.etapes.create(data));
  }

  async updateEtape(id: string, data: Partial<WorkflowEtape>): Promise<WorkflowEtape> {
    const etape = await this.etapes.findOneBy({ id });
    if (!etape) throw new NotFoundException('Étape introuvable');
    await this.etapes.update(id, data);
    return this.etapes.findOneByOrFail({ id });
  }

  async removeEtape(id: string): Promise<void> {
    const etape = await this.etapes.findOneBy({ id });
    if (!etape) throw new NotFoundException('Étape introuvable');
    await this.etapes.delete(id);
  }

  // --- Transitions ---

  findTransitions(workflowDefinitionId: string): Promise<WorkflowTransition[]> {
    return this.transitions.find({ where: { workflowDefinitionId } });
  }

  createTransition(data: Partial<WorkflowTransition>): Promise<WorkflowTransition> {
    return this.transitions.save(this.transitions.create(data));
  }

  async updateTransition(id: string, data: Partial<WorkflowTransition>): Promise<WorkflowTransition> {
    const transition = await this.transitions.findOneBy({ id });
    if (!transition) throw new NotFoundException('Transition introuvable');
    await this.transitions.update(id, data as Parameters<typeof this.transitions.update>[1]);
    return this.transitions.findOneByOrFail({ id });
  }

  async removeTransition(id: string): Promise<void> {
    const transition = await this.transitions.findOneBy({ id });
    if (!transition) throw new NotFoundException('Transition introuvable');
    await this.transitions.delete(id);
  }

  // --- Acteurs de transition ---

  findActeurs(transitionId: string): Promise<WorkflowTransitionActeur[]> {
    return this.acteurs.find({ where: { workflowTransitionId: transitionId } });
  }

  createActeur(data: Partial<WorkflowTransitionActeur>): Promise<WorkflowTransitionActeur> {
    this.validerActeur(data);
    return this.acteurs.save(this.acteurs.create(data));
  }

  async removeActeur(id: string): Promise<void> {
    const acteur = await this.acteurs.findOneBy({ id });
    if (!acteur) throw new NotFoundException('Acteur introuvable');
    await this.acteurs.delete(id);
  }

  // Reflète workflow_transition_roles_type_ck (0020) : exactement une des quatre
  // colonnes cible pour role/fonction/entite/entite_et_descendants/utilisateur ;
  // aucune pour les deux types 'courant' (résolus dynamiquement à l'exécution).
  private validerActeur(data: Partial<WorkflowTransitionActeur>): void {
    const type = data.typeActeur ?? 'role';
    const champs = {
      roleId: data.roleId ?? null,
      fonctionId: data.fonctionId ?? null,
      entiteId: data.entiteId ?? null,
      utilisateurId: data.utilisateurId ?? null,
    };
    const renseignes = Object.entries(champs)
      .filter(([, v]) => v != null)
      .map(([k]) => k);

    if (type === 'responsable_entite_courante' || type === 'superieur_hierarchique_courant') {
      if (renseignes.length > 0) {
        throw new BadRequestException(`Le type d'acteur '${type}' ne doit référencer aucune cible directe`);
      }
      return;
    }

    const attenduParType: Record<string, keyof typeof champs> = {
      role: 'roleId',
      fonction: 'fonctionId',
      entite: 'entiteId',
      entite_et_descendants: 'entiteId',
      utilisateur: 'utilisateurId',
    };
    const champAttendu = attenduParType[type];
    if (renseignes.length !== 1 || renseignes[0] !== champAttendu) {
      throw new BadRequestException(`Le type d'acteur '${type}' doit référencer exactement le champ '${champAttendu}'`);
    }
  }

  // --- Associations définition <-> valeur de liste ---

  findAssociations(workflowDefinitionId: string): Promise<WorkflowDefinitionAssociation[]> {
    return this.associations.find({ where: { workflowDefinitionId } });
  }

  createAssociation(data: Partial<WorkflowDefinitionAssociation>): Promise<WorkflowDefinitionAssociation> {
    return this.associations.save(this.associations.create(data));
  }

  async removeAssociation(id: string): Promise<void> {
    const association = await this.associations.findOneBy({ id });
    if (!association) throw new NotFoundException('Association introuvable');
    await this.associations.delete(id);
  }
}
