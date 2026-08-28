-- Journal d'audit générique, alimenté par un seul trigger réutilisé sur les
-- tables sensibles plutôt qu'une table/fonction d'audit par domaine.

create table public.journal_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  utilisateur_id uuid references public.utilisateurs(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  module_id uuid references public.modules(id) on delete set null,
  action_id uuid references public.actions(id) on delete set null,
  objet_type text not null,
  objet_id uuid,
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  adresse_ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_journal_audit_objet on public.journal_audit(objet_type, objet_id);
create index idx_journal_audit_utilisateur on public.journal_audit(utilisateur_id);

-- Trigger générique: fonctionne sur n'importe quelle table auditée grâce à
-- TG_TABLE_NAME/TG_OP et à l'extraction dynamique de organisation_id (absente
-- de certaines tables comme `permissions`, d'où le coalesce sur to_jsonb).
create or replace function app.fn_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action_code text;
  v_action_id uuid;
  v_organisation_id uuid;
  v_objet_id uuid;
begin
  v_action_code := case tg_op
    when 'INSERT' then 'creer'
    when 'UPDATE' then 'modifier'
    when 'DELETE' then 'supprimer'
  end;

  select id into v_action_id from public.actions where code = v_action_code;

  if tg_op = 'DELETE' then
    v_objet_id := old.id;
  else
    v_objet_id := new.id;
  end if;

  begin
    v_organisation_id := (to_jsonb(coalesce(new, old))->>'organisation_id')::uuid;
  exception when others then
    v_organisation_id := null;
  end;

  insert into public.journal_audit (
    utilisateur_id, organisation_id, module_id, action_id,
    objet_type, objet_id, ancienne_valeur, nouvelle_valeur
  )
  values (
    auth.uid(),
    v_organisation_id,
    null,
    v_action_id,
    tg_table_name,
    v_objet_id,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

-- Défense en profondeur: seul ce trigger (SECURITY DEFINER) écrit dans le journal.
revoke insert, update, delete on public.journal_audit from authenticated;

create trigger trg_audit_courriers
  after insert or update or delete on public.courriers
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_documents
  after insert or update or delete on public.documents
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_missions
  after insert or update or delete on public.missions
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_projets
  after insert or update or delete on public.projets
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_utilisateurs
  after insert or update or delete on public.utilisateurs
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_roles
  after insert or update or delete on public.roles
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_permissions
  after insert or update or delete on public.permissions
  for each row execute function app.fn_audit_trigger();

create trigger trg_audit_workflow_instances
  after insert or update or delete on public.workflow_instances
  for each row execute function app.fn_audit_trigger();
