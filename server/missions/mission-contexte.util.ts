import { Mission } from './entities/mission.entity';

// Équivalent Missions de courrier-contexte.util.ts / ged-versement-contexte.util.ts :
// reconstitue to_jsonb(v_mission) (clés SQL snake_case) pour condition.util.ts#conditionSatisfaite.
export function missionVersContexte(mission: Mission): Record<string, unknown> {
  return {
    id: mission.id,
    organisation_id: mission.organisationId,
    entite_id: mission.entiteId,
    reference: mission.reference,
    objet: mission.objet,
    responsable_id: mission.responsableId,
    lieu: mission.lieu,
    date_depart: mission.dateDepart,
    date_retour: mission.dateRetour,
    objectifs: mission.objectifs,
    activites_prevues: mission.activitesPrevues,
    budget_prevu: mission.budgetPrevu,
    budget_reel: mission.budgetReel,
    workflow_instance_id: mission.workflowInstanceId,
    etape_code: mission.etapeCode,
    etape_libelle: mission.etapeLibelle,
    ordre_mission_document_id: mission.ordreMissionDocumentId,
    compte_rendu_document_id: mission.compteRenduDocumentId,
    pv_document_id: mission.pvDocumentId,
    recommandations: mission.recommandations,
    created_by: mission.createdBy,
    created_at: mission.createdAt,
    updated_at: mission.updatedAt,
  };
}
