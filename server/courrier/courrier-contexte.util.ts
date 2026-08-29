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
