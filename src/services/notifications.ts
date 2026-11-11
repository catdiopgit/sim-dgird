import { api } from '../config/apiClient';

export interface NotificationUtilisateur {
  id: string;
  titre: string;
  message: string | null;
  objetModule: string | null;
  objetId: string | null;
  lienUrl: string | null;
  lu: boolean;
  createdAt: string;
}

export interface MesNotifications {
  nonLues: number;
  notifications: NotificationUtilisateur[];
}

export function listMesNotifications(limite = 30): Promise<MesNotifications> {
  return api.get<MesNotifications>('/notifications/mes', { limite });
}

export async function marquerNotificationLue(id: string): Promise<void> {
  await api.post(`/notifications/${id}/lue`);
}

export async function marquerToutesNotificationsLues(): Promise<void> {
  await api.post('/notifications/toutes-lues');
}

// Lien interne vers l'objet concerné (courrier, versement GED…).
export function lienNotification(n: NotificationUtilisateur): string | null {
  if (n.lienUrl) return n.lienUrl;
  if (!n.objetId) return null;
  if (n.objetModule === 'courrier') return `/courriers/${n.objetId}`;
  return null;
}
