interface PostgrestLikeError {
  code?: string;
  message?: string;
}

// Code Postgres pour une violation de contrainte de clé étrangère (ex: suppression
// d'une entité qui a des enfants — `entites.parent_entite_id` est `on delete restrict`).
export function estViolationCleEtrangere(error: unknown): boolean {
  return (error as PostgrestLikeError | null)?.code === '23503';
}

export function messageErreurSuppression(error: unknown, libelleObjet: string): string {
  if (estViolationCleEtrangere(error)) {
    return `Impossible de supprimer ${libelleObjet} : encore utilisé ailleurs dans l'application.`;
  }
  return (error as PostgrestLikeError | null)?.message ?? `Échec de la suppression de ${libelleObjet}.`;
}
