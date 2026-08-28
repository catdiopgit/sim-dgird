-- Projets V3 bis (§2/§4) : un décaissement précise désormais son origine —
-- contrat d'origine (avenant_id null) ou un avenant précis — pour permettre
-- un suivi séparé des cumuls et servir de base au calcul automatique
-- montant <-> pourcentage côté frontend. Voir documentation/Gestion de
-- projet V3 bis.txt.

alter table public.decaissements
  add column avenant_id uuid references public.avenants(id) on delete set null;

create index idx_decaissements_avenant on public.decaissements(avenant_id);

-- §5 Contrôles de cohérence, désormais par origine : le cumul (pourcentage
-- et montant) et le montant de référence se calculent sur les décaissements
-- de la même origine (même avenant_id, ou tous ceux sans avenant pour le
-- contrat d'origine) plutôt que sur l'ensemble du projet.
create or replace function app.fn_verifier_decaissement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cumul_pct numeric;
  v_cumul_montant numeric;
  v_montant_base numeric;
  v_origine text;
begin
  select coalesce(sum(pourcentage), 0), coalesce(sum(montant), 0)
  into v_cumul_pct, v_cumul_montant
  from public.decaissements
  where projet_id = new.projet_id
    and avenant_id is not distinct from new.avenant_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

  if new.avenant_id is not null then
    select montant into v_montant_base from public.avenants where id = new.avenant_id;
    v_origine := 'pour cet avenant';
  else
    select budget_prevu into v_montant_base from public.projets where id = new.projet_id;
    v_origine := 'pour le contrat d''origine';
  end if;

  if v_cumul_pct + new.pourcentage > 100 then
    raise exception 'Le cumul des pourcentages décaissés % dépasserait 100%% (déjà % %%)',
      v_origine, round(v_cumul_pct, 2);
  end if;

  if v_montant_base is not null and v_cumul_montant + new.montant > v_montant_base then
    raise exception 'Le cumul des montants décaissés % (%) dépasserait le montant de référence (%)',
      v_origine, round(v_cumul_montant + new.montant, 2), round(v_montant_base, 2);
  end if;

  return new;
end;
$$;

-- Recrée le trigger pour que l'origine (avenant_id) déclenche aussi la
-- revalidation, pas seulement pourcentage/montant/projet_id (0073).
drop trigger if exists trg_decaissements_verifier on public.decaissements;
create trigger trg_decaissements_verifier
  before insert or update of pourcentage, montant, projet_id, avenant_id on public.decaissements
  for each row execute function app.fn_verifier_decaissement();
