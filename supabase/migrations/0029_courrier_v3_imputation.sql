-- Gestion des courriers V3 (étape 4/8, cf. plan) : l'imputation devient une
-- action de workflow à part entière — elle met à jour l'entité/l'agent en
-- charge du courrier, enregistre l'instruction/échéance (réutilise
-- courrier_destinataires avec type_diffusion='principal', cf. 0020) et peut
-- déclencher une transition (typiquement "affecter") en une seule opération
-- transactionnelle, plutôt que deux actions manuelles séparées.

create or replace function public.fn_imputer_courrier(
  p_courrier_id uuid,
  p_entite_id uuid,
  p_agent_id uuid default null,
  p_instruction text default null,
  p_echeance date default null,
  p_transition_id uuid default null,
  p_commentaire text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_entite_avant uuid;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  -- Même règle que courriers_update (0015) et fn_executer_transition_courrier
  -- (0019): créateur ou permission 'modifier'. Le ciblage fin par acteur reste
  -- appliqué séparément par app.fn_executer_transition si une transition est
  -- demandée.
  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  v_entite_avant := v_courrier.entite_id;

  update public.courriers
  set entite_id = p_entite_id,
      agent_destinataire_id = p_agent_id
  where id = p_courrier_id
  returning * into v_courrier;

  insert into public.courrier_destinataires (
    courrier_id, entite_id, utilisateur_id, type_diffusion, instruction, echeance
  ) values (
    p_courrier_id, p_entite_id, p_agent_id, 'principal', p_instruction, p_echeance
  );

  if p_transition_id is not null then
    if v_courrier.workflow_instance_id is null then
      raise exception 'Courrier % sans instance de workflow', p_courrier_id;
    end if;
    -- p_entite_objet = entité AVANT imputation: cohérent avec
    -- fn_transitions_disponibles_courrier, qui a évalué la disponibilité de
    -- cette transition sur cette même valeur.
    perform app.fn_executer_transition(
      v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_entite_avant
    );
  end if;

  return v_courrier;
end;
$$;

grant execute on function public.fn_imputer_courrier(uuid, uuid, uuid, text, date, uuid, text) to authenticated;
