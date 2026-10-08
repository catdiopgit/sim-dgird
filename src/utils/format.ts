// Montants en FCFA : forme complète (tableaux, fiches) ou abrégée k / M / Md
// (cartes, indicateurs).
export function formatMontant(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`;
}

export function montantCourt(v: number): string {
  const abs = Math.abs(v);
  const [div, suffixe] = abs >= 1e9 ? [1e9, ' Md'] : abs >= 1e6 ? [1e6, ' M'] : abs >= 1e3 ? [1e3, ' k'] : [1, ''];
  return `${(v / div).toLocaleString('fr-FR', { maximumFractionDigits: div === 1 ? 0 : 2 })}${suffixe}`;
}
