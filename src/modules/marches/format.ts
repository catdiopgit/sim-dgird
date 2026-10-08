import { fr } from '../../utils/dateFr';

// Date courte (JJ/MM/AAAA) des écrans Marchés, « — » si absente.
export function dateCourte(date: string | null | undefined): string {
  return date ? fr(date).format('DD/MM/YYYY') : '—';
}
