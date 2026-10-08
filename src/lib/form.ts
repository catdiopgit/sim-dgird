import dayjs from 'dayjs';

// Attributs d'accessibilité d'un contrôle selon son erreur (le message est
// rendu par <Champ> avec l'id `${id}-erreur`).
export function ariaErreur(id: string, erreur: unknown) {
  return { id, 'aria-invalid': Boolean(erreur), 'aria-describedby': erreur ? `${id}-erreur` : undefined };
}

// react-hook-form + <input type="number"> : chaîne vide -> undefined (champ
// facultatif), sinon nombre.
export const nombreOuVide = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

// Date ISO (colonne date PostgreSQL) -> valeur d'un <input type="date">.
export const versChampDate = (v: string | null | undefined) => (v ? dayjs(v).format('YYYY-MM-DD') : '');
