import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMesNotifications,
  marquerNotificationLue,
  marquerToutesNotificationsLues,
} from '../services/notifications';

export function useMesNotifications() {
  return useQuery({
    queryKey: ['mes-notifications'],
    queryFn: () => listMesNotifications(30),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarquerNotificationLue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => marquerNotificationLue(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mes-notifications'] }),
  });
}

export function useMarquerToutesNotificationsLues() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marquerToutesNotificationsLues(),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['mes-notifications'] }),
  });
}
