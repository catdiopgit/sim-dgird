import { useMemo } from 'react';
import { useParametresOrganisation } from './useParametrage';

export interface EnteteDocument {
  lignesEnTete: string[];
  logoDroitUrl: string | null;
  piedDePage: string | null;
}

const ENTETE_VIDE: EnteteDocument = { lignesEnTete: [], logoDroitUrl: null, piedDePage: null };

// Clé générique (parametres_organisation) partagée par tous les documents
// imprimés de l'organisation (fiche d'exploitation, statistiques…) — définie
// dans Administration > Paramétrage > En-tête document
// (EnteteDocumentManager.tsx). Un seul endroit pour lire/parser cette valeur.
export const CLE_ENTETE_DOCUMENT = 'document.entete';

export function useEnteteDocument(organisationId: string | undefined): EnteteDocument {
  const { data: parametres } = useParametresOrganisation(organisationId);

  return useMemo<EnteteDocument>(() => {
    const p = (parametres ?? []).find((p) => p.cle === CLE_ENTETE_DOCUMENT);
    const valeur = p?.valeur;
    if (valeur && typeof valeur === 'object' && !Array.isArray(valeur)) {
      const v = valeur as Record<string, unknown>;
      // La couche API convertit récursivement les clés en snake_case (toSnakeCase) :
      // la valeur JSON enregistrée en camelCase revient donc en lignes_en_tete, etc.
      const lignes = v.lignesEnTete ?? v.lignes_en_tete;
      const logo = v.logoDroitUrl ?? v.logo_droit_url;
      const pied = v.piedDePage ?? v.pied_de_page;
      return {
        lignesEnTete: Array.isArray(lignes) ? lignes.filter((l): l is string => typeof l === 'string') : [],
        logoDroitUrl: typeof logo === 'string' ? logo : null,
        piedDePage: typeof pied === 'string' ? pied : null,
      };
    }
    return ENTETE_VIDE;
  }, [parametres]);
}
