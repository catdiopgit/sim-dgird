import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  abonnerNotifications,
  DUREE_MS,
  lireNotifications,
  retirerNotification,
  type Notification,
  type TypeNotification,
} from '../../lib/notifications';
import { cn } from '../../lib/utils';

const STYLES: Record<TypeNotification, { icone: LucideIcon; couleur: string }> = {
  success: { icone: CircleCheck, couleur: 'text-good-text' },
  error: { icone: CircleAlert, couleur: 'text-crit-text' },
  warning: { icone: TriangleAlert, couleur: 'text-warn-text' },
  info: { icone: Info, couleur: 'text-primary' },
};

function Toast({ notification }: { notification: Notification }) {
  const { icone: Icone, couleur } = STYLES[notification.type];
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demarrer = () => {
    minuteur.current = setTimeout(() => retirerNotification(notification.id), DUREE_MS[notification.type]);
  };
  const suspendre = () => {
    if (minuteur.current) clearTimeout(minuteur.current);
  };

  useEffect(() => {
    demarrer();
    return suspendre;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role={notification.type === 'error' ? 'alert' : undefined}
      onMouseEnter={suspendre}
      onMouseLeave={demarrer}
      className={cn(
        'pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-lg border border-border bg-card py-2.5 pl-3.5 pr-2 text-[13.5px] text-foreground shadow-lg',
        'animate-[notif-entree_160ms_ease-out]',
      )}
    >
      <Icone className={cn('mt-0.5 size-4 shrink-0', couleur)} aria-hidden />
      <span className="min-w-0 flex-1 break-words">{notification.texte}</span>
      <button
        type="button"
        onClick={() => retirerNotification(notification.id)}
        className="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Fermer la notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

// Pile de notifications en haut au centre (même position que antd message),
// au-dessus des fenêtres (z-[1000]) pour rester visible pendant une saisie.
export function Notifications() {
  const liste = useSyncExternalStore(abonnerNotifications, lireNotifications, lireNotifications);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[2010] flex flex-col items-center gap-2 px-4"
    >
      {liste.map((n) => (
        <Toast key={n.id} notification={n} />
      ))}
    </div>
  );
}
