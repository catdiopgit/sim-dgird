import type { DataSource, EntityManager } from 'typeorm';
import { Courrier } from './entities/courrier.entity';

// Reconstitue l'équivalent de to_jsonb(courrier) (clés SQL en snake_case) pour
// évaluer condition.util.ts#conditionSatisfaite — les conditions de transition
// configurées dans le référentiel référencent les noms de colonnes SQL, pas les
// propriétés camelCase de l'entité TypeORM.
export function courrierVersContexte(courrier: Courrier): Record<string, unknown> {
  return {
    id: courrier.id,
    organisation_id: courrier.organisationId,
    entite_id: courrier.entiteId,
    sens: courrier.sens,
    numero: courrier.numero,
    type_valeur_id: courrier.typeValeurId,
    priorite_valeur_id: courrier.prioriteValeurId,
    confidentialite_valeur_id: courrier.confidentialiteValeurId,
    mode_transmission_valeur_id: courrier.modeTransmissionValeurId,
    expediteur_type_valeur_id: courrier.expediteurTypeValeurId,
    statut_reception_valeur_id: courrier.statutReceptionValeurId,
    objet: courrier.objet,
    date_courrier: courrier.dateCourrier,
    date_reception: courrier.dateReception,
    date_envoi: courrier.dateEnvoi,
    expediteur_nom: courrier.expediteurNom,
    expediteur_contact_id: courrier.expediteurContactId,
    destinataire_texte: courrier.destinataireTexte,
    entite_destinataire_id: courrier.entiteDestinataireId,
    agent_destinataire_id: courrier.agentDestinataireId,
    contact_destinataire_id: courrier.contactDestinataireId,
    reference_expediteur: courrier.referenceExpediteur,
    redacteur_id: courrier.redacteurId,
    workflow_instance_id: courrier.workflowInstanceId,
    etape_code: courrier.etapeCode,
    etape_libelle: courrier.etapeLibelle,
    courrier_parent_id: courrier.courrierParentId,
    observations: courrier.observations,
    verrouille_le: courrier.verrouilleLe,
    verrouille_par: courrier.verrouillePar,
    created_by: courrier.createdBy,
    created_at: courrier.createdAt,
    updated_at: courrier.updatedAt,
    supprime_le: courrier.supprimeLe,
  };
}

// Acteur de transition 'destinataire_courant' : uniquement l'agent auquel le
// courrier a été affecté (agent_destinataire_id). Recette 2026-11 : la personne
// réceptrice de l'entité ne remplace plus l'agent tant qu'aucune affectation
// n'a eu lieu (elle reçoit et suit, elle ne traite pas) — voir l'acteur
// 'receptrice_deleguee_entite_courante' pour l'affectation au nom du responsable.
export async function resoudreDestinataireCourantCourrier(
  courrier: Pick<Courrier, 'agentDestinataireId' | 'entiteId'>,
  _runner?: DataSource | EntityManager,
): Promise<string | null> {
  return courrier.agentDestinataireId ?? null;
}

// Personne réceptrice autorisée par son entité à affecter au nom du responsable.
export async function estReceptriceDeleguee(
  runner: DataSource | EntityManager,
  utilisateurId: string,
  entiteId: string | null,
): Promise<boolean> {
  if (!entiteId) return false;
  const rows: unknown[] = await runner.query(
    'select 1 from entites where id = $1 and personne_receptrice_id = $2 and receptrice_peut_affecter limit 1',
    [entiteId, utilisateurId],
  );
  return rows.length > 0;
}
