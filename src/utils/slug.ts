const ACCENTS: Record<string, string> = {
  a: 'aàáâãäå',
  e: 'eèéêë',
  i: 'iìíîï',
  o: 'oòóôõö',
  u: 'uùúûü',
  c: 'cç',
  n: 'nñ',
  y: 'yýÿ',
};

const TABLE_DEPLIEE: Record<string, string> = Object.entries(ACCENTS).reduce(
  (acc, [base, variantes]) => {
    for (const variante of variantes) acc[variante] = base;
    return acc;
  },
  {} as Record<string, string>,
);

// Propose un code technique (kebab-case, sans accents) a partir d'un libelle
// saisi par l'utilisateur -- reste editable, jamais impose.
export function slugifier(texte: string): string {
  const sansAccents = texte
    .toLowerCase()
    .split('')
    .map((car) => TABLE_DEPLIEE[car] ?? car)
    .join('');
  return sansAccents
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
