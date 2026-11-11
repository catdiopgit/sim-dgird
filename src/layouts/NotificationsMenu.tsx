import { Bell, CheckCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useMarquerNotificationLue, useMarquerToutesNotificationsLues, useMesNotifications } from '../hooks/useNotifications';
import { cn } from '../lib/utils';
import { lienNotification } from '../services/notifications';
import { fr } from '../utils/dateFr';

interface Props {
  // Échéances dépassées (alerte existante de la cloche), affichées en tête du menu.
  echeancesDepassees: number;
}

export function NotificationsMenu({ echeancesDepassees }: Props) {
  const navigate = useNavigate();
  const { data } = useMesNotifications();
  const marquerLue = useMarquerNotificationLue();
  const toutLu = useMarquerToutesNotificationsLues();

  const nonLues = data?.nonLues ?? 0;
  const total = nonLues + echeancesDepassees;
  const notifications = data?.notifications ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={total > 0 ? `${nonLues} notification(s) non lue(s), ${echeancesDepassees} échéance(s) dépassée(s)` : 'Notifications'}
          title="Notifications"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {total > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-crit px-1 text-[10px] font-bold tabular-nums text-white">
              {total > 99 ? '99+' : total}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-[13px] font-semibold">Notifications</span>
          {nonLues > 0 && (
            <button
              type="button"
              className="flex items-center gap-1 text-[12px] text-primary hover:underline"
              onClick={() => toutLu.mutate()}
            >
              <CheckCheck className="size-3.5" /> Tout marquer comme lu
            </button>
          )}
        </div>
        <DropdownMenuSeparator className="my-0" />
        {echeancesDepassees > 0 && (
          <>
            <DropdownMenuItem className="gap-2 px-3 py-2.5" onSelect={() => navigate('/courriers?vue=en_retard')}>
              <Clock className="size-4 text-crit" />
              <span className="text-[13px]">
                {echeancesDepassees} échéance{echeancesDepassees > 1 ? 's' : ''} dépassée{echeancesDepassees > 1 ? 's' : ''}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-0" />
          </>
        )}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-muted-foreground">Aucune notification.</p>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn('flex flex-col items-start gap-0.5 px-3 py-2.5', !n.lu && 'bg-primary/5')}
                onSelect={() => {
                  if (!n.lu) marquerLue.mutate(n.id);
                  const lien = lienNotification(n);
                  if (lien) navigate(lien);
                }}
              >
                <div className="flex w-full items-start gap-2">
                  {!n.lu && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Non lue" />}
                  <span className={cn('text-[13px] leading-snug', !n.lu && 'font-semibold')}>{n.titre}</span>
                </div>
                {n.message && (
                  <span className="line-clamp-2 whitespace-pre-line text-[12px] text-muted-foreground">{n.message}</span>
                )}
                <span className="text-[11px] text-muted-foreground">{fr(n.createdAt).format('D MMM YYYY à HH:mm')}</span>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
