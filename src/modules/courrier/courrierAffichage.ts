import { ArrowLeftRight, Inbox, Send, type LucideIcon } from 'lucide-react';
import type { SensCourrier } from '../../services/courrier/courriers';

export const LABEL_SENS: Record<SensCourrier, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
  interne: 'Interne',
};

export const DESCRIPTION_SENS: Record<SensCourrier, string> = {
  entrant: "Reçu d'un tiers",
  sortant: "Envoyé à l'extérieur",
  interne: 'Entre entités',
};

export const ICONE_SENS: Record<SensCourrier, { icone: LucideIcon; classe: string }> = {
  entrant: { icone: Inbox, classe: 'text-info' },
  sortant: { icone: Send, classe: 'text-primary' },
  interne: { icone: ArrowLeftRight, classe: 'text-gold' },
};

// Niveau de confidentialité restreint, déduit du code du référentiel
// (courrier_confidentialite) : 'confidentielle', 'secrete'…
export function estConfidentiel(code: string | undefined): boolean {
  return Boolean(code && /confiden|secr/i.test(code));
}
