-- Couleur institutionnelle configurable par organisation, appliquée au thème
-- de l'application (y compris la page de connexion, avant authentification).

alter table public.organisations
  add column couleur_primaire text;

comment on column public.organisations.couleur_primaire is
  'Couleur primaire (hex #RRGGBB) de la charte graphique de l''organisation. NULL = couleur institutionnelle par défaut.';

-- Vue publique minimale exposant uniquement les éléments de marque (nom, logo,
-- couleur) nécessaires à l'habillage de la page de connexion, avant
-- authentification. Volontairement restreinte à ces colonnes : ne jamais y
-- ajouter code/description/timestamps ou toute donnée non destinée à un accès
-- anonyme. Une vue s'exécute avec les privilèges de son propriétaire
-- (postgres), donc elle contourne intentionnellement la policy RLS
-- `organisations_select` (réservée aux membres via
-- app.current_organisation_id(), voir 0014_rls_core.sql) pour ce sous-ensemble
-- public.
create view public.organisation_branding as
  select id, nom, logo_url, couleur_primaire
  from public.organisations
  where actif = true
  order by created_at asc
  limit 1;

grant select on public.organisation_branding to anon, authenticated;
