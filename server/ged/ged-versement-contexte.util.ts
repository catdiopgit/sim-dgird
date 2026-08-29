import { GedVersement } from './entities/ged-versement.entity';

// Équivalent GED de courrier-contexte.util.ts : reconstitue to_jsonb(v_versement)
// (clés SQL snake_case) pour condition.util.ts#conditionSatisfaite.
export function versementVersContexte(versement: GedVersement): Record<string, unknown> {
  return {
    id: versement.id,
    organisation_id: versement.organisationId,
    entite_id: versement.entiteId,
    dossier_cible_id: versement.dossierCibleId,
    objet: versement.objet,
    description: versement.description,
    brouillon: versement.brouillon,
    workflow_instance_id: versement.workflowInstanceId,
    etape_code: versement.etapeCode,
    etape_libelle: versement.etapeLibelle,
    redacteur_id: versement.redacteurId,
    created_at: versement.createdAt,
    updated_at: versement.updatedAt,
    supprime_le: versement.supprimeLe,
  };
}
