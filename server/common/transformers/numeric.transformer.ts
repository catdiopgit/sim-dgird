import type { ValueTransformer } from 'typeorm';

// Le driver pg renvoie les colonnes `numeric` en chaîne (pour ne jamais
// perdre de précision sur de très grands nombres) — sans ce transformer,
// budget_prevu/montant/etc. arrivent en JSON comme "1000000.00" et tout
// calcul arithmétique côté frontend (budget - décaissé, %) silencieusement
// se transforme soit en concaténation de chaînes, soit en NaN. Les montants
// manipulés ici (budgets, décaissements) restent largement sous
// Number.MAX_SAFE_INTEGER, donc la conversion en number est sûre.
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value === null || value === undefined ? value : Number(value)),
};
