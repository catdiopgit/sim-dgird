import type { UtilisateurOption } from '../../services/administration/entites';

export type PorteeDiffusion = 'responsable' | 'entite' | 'entite_et_descendants';

// Aperçu, côté interface, des agents qu'une note de service atteindra : agents
// actifs de l'entité (et de ses sous-entités pour « entite_et_descendants »),
// triés par nom. La liste définitive est établie par le serveur à la diffusion
// (agents actifs ayant un compte SIM, sans la personne qui diffuse).
export function agentsDuPerimetre(
  entiteId: string,
  portee: PorteeDiffusion | null | undefined,
  entites: Array<{ id: string; parent_entite_id: string | null }> | undefined,
  utilisateurs: UtilisateurOption[] | undefined,
): UtilisateurOption[] {
  if (portee === 'responsable' || !entites || !utilisateurs) return [];
  const perimetre = new Set<string>([entiteId]);
  if (portee === 'entite_et_descendants') {
    let ajoute = true;
    while (ajoute) {
      ajoute = false;
      for (const e of entites) {
        if (e.parent_entite_id && perimetre.has(e.parent_entite_id) && !perimetre.has(e.id)) {
          perimetre.add(e.id);
          ajoute = true;
        }
      }
    }
  }
  return utilisateurs
    .filter((u) => u.entiteId && perimetre.has(u.entiteId) && (!u.statut || u.statut === 'actif'))
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`));
}
