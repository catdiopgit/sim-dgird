// Portage fidèle de app.fn_condition_satisfaite (0020_workflow_v2.sql) : évalue la
// condition JSON d'une transition ({ champ, operateur, valeur }) contre un contexte
// (l'équivalent TS de to_jsonb(ligne_metier)). Fonction pure, ne touche pas la DB.
// Toute erreur d'évaluation (ex. comparaison numérique sur une valeur non numérique)
// est avalée et renvoie false, comme le bloc EXCEPTION de la fonction SQL d'origine.
export function conditionSatisfaite(
  condition: Record<string, unknown> | null | undefined,
  contexte: Record<string, unknown>,
): boolean {
  try {
    if (!condition || Object.keys(condition).length === 0) return true;

    const champ = condition.champ as string | undefined;
    if (!champ) return true;

    const operateur = (condition.operateur as string | undefined) ?? '=';
    const valeur = condition.valeur;
    const valeurContexte = contexte[champ];

    switch (operateur) {
      case '=':
        return jsonEquals(valeurContexte, valeur);
      case '<>':
        return !jsonEquals(valeurContexte, valeur);
      case 'in':
        return Array.isArray(valeur) && valeur.some((v) => jsonEquals(valeurContexte, v));
      case '>':
      case '<':
      case '>=':
      case '<=':
        return compareNumeric(operateur, valeurContexte, valeur);
      default:
        return true;
    }
  } catch {
    return false;
  }
}

function jsonEquals(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function compareNumeric(operateur: '>' | '<' | '>=' | '<=', a: unknown, b: unknown): boolean {
  const left = toNumeric(a);
  const right = toNumeric(b);
  if (left === null || right === null) return false;
  switch (operateur) {
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '>=':
      return left >= right;
    case '<=':
      return left <= right;
  }
}

function toNumeric(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' || typeof value === 'boolean') {
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}
