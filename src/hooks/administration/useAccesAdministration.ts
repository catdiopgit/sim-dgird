import { useMemo } from 'react';
import { useAccesMarches } from '../marches/useMarches';
import { useProfile } from '../useProfile';

export type SectionAdministration =
  | 'organisation'
  | 'utilisateurs'
  | 'roles'
  | 'workflows'
  | 'delegations'
  | 'parametrage'
  | 'audit';

// v8.6.4 — ce que l'utilisateur peut voir dans l'Administration :
//  - administrateur (« Administration » consulter / créer / modifier) : tout ;
//  - gestion des comptes (« Utilisateurs ») : la rubrique Utilisateurs ;
//  - archiviste : Paramétrage → Plan de classement seulement ;
//  - cellule de passation (paramétrage des marchés) : Paramétrage → Marchés.
// Le bouton Administration du menu n'apparaît que si une rubrique est ouverte.
// Le serveur contrôle de son côté chaque action.
export function useAccesAdministration() {
  const { profile, can, canEtendu, loading } = useProfile();
  const { data: accesMarches, isLoading: chargementMarches } = useAccesMarches();
  const entite = profile?.entite_id ?? null;

  return useMemo(() => {
    const droit = (module: string, actions: string[]) => actions.some((a) => can(module, a, entite) || can(module, a));
    const admin = droit('administration', ['consulter', 'creer', 'modifier']);
    const utilisateurs = admin || droit('utilisateurs', ['consulter', 'creer', 'modifier', 'affecter']);
    const planClassement = canEtendu('ged', 'archiver') || canEtendu('administration', 'modifier');
    const marches = Boolean(accesMarches?.parametrage);

    const sections: Record<SectionAdministration, boolean> = {
      organisation: admin,
      utilisateurs,
      roles: admin,
      workflows: admin,
      delegations: admin,
      parametrage: admin || planClassement || marches,
      audit: admin,
    };
    return {
      sections,
      parametrage: { general: admin, planClassement, marches },
      visible: Object.values(sections).some(Boolean),
      chargement: loading || chargementMarches,
    };
  }, [can, canEtendu, entite, accesMarches?.parametrage, loading, chargementMarches]);
}
