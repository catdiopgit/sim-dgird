-- Notifications utilisateur, génériques à tous les modules.

create type public.canal_notification as enum ('in_app', 'email', 'sms', 'push');

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  destinataire_id uuid not null references public.utilisateurs(id) on delete cascade,
  module_id uuid references public.modules(id) on delete set null,
  type_valeur_id uuid references public.valeurs_listes(id) on delete set null,
  titre text not null,
  message text,
  -- objet_module/objet_id: référence polymorphe vers l'objet source (courrier, document,
  -- mission, livrable...), volontairement sans FK stricte pour rester générique.
  objet_module text,
  objet_id uuid,
  lien_url text,
  lu boolean not null default false,
  lu_le timestamptz,
  canal public.canal_notification not null default 'in_app',
  envoye_le timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_destinataire on public.notifications(destinataire_id, lu);
