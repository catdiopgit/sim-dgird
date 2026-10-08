// Notifications éphémères (remplace `message` d'antd) : même API
// `message.success(texte)` / `message.error(texte)`, appelable hors React
// (hooks de mutation). Affichées par <Notifications /> (App.tsx).

export type TypeNotification = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: number;
  type: TypeNotification;
  texte: string;
}

// Durées d'affichage : une erreur reste plus longtemps pour laisser le temps
// de la lire (antd : 3 s pour toutes).
export const DUREE_MS: Record<TypeNotification, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 6000,
};

const MAX_VISIBLES = 4;

let notifications: Notification[] = [];
let prochainId = 1;
const abonnes = new Set<() => void>();

function publier() {
  for (const abonne of abonnes) abonne();
}

function ajouter(type: TypeNotification, texte: string) {
  // Même message déjà affiché (ex. double clic) : pas de doublon empilé.
  if (notifications.some((n) => n.type === type && n.texte === texte)) return;
  notifications = [...notifications, { id: prochainId++, type, texte }].slice(-MAX_VISIBLES);
  publier();
}

export function retirerNotification(id: number) {
  notifications = notifications.filter((n) => n.id !== id);
  publier();
}

export function abonnerNotifications(abonne: () => void) {
  abonnes.add(abonne);
  return () => {
    abonnes.delete(abonne);
  };
}

export function lireNotifications() {
  return notifications;
}

export const message = {
  success: (texte: string) => ajouter('success', texte),
  error: (texte: string) => ajouter('error', texte),
  warning: (texte: string) => ajouter('warning', texte),
  info: (texte: string) => ajouter('info', texte),
};
