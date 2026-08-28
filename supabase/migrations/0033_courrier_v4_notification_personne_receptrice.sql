-- Gestion des courriers V4 (suite étape 1/7) : à l'imputation, si l'entité
-- cible a une personne réceptrice configurée (0032), elle doit automatiquement
-- recevoir une notification et une copie (courrier_destinataires, type_diffusion
-- = 'copie') pour voir le courrier dans ses bannettes — sans qu'aucune saisie
-- manuelle ne soit nécessaire (cf. plan V4 §9). Signature inchangée par
-- rapport à 0029 (pas de nouveau paramètre): CREATE OR REPLACE suffit.

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
  v_personne_receptrice_id uuid;
  v_module_courrier_id uuid;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

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

  -- Personne réceptrice de l'entité imputée: copie + notification automatiques.
  select personne_receptrice_id into v_personne_receptrice_id
  from public.entites where id = p_entite_id;

  if v_personne_receptrice_id is not null then
    insert into public.courrier_destinataires (courrier_id, utilisateur_id, type_diffusion)
    values (p_courrier_id, v_personne_receptrice_id, 'copie');

    select id into v_module_courrier_id from public.modules where code = 'courrier';

    insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
    values (
      v_personne_receptrice_id,
      v_module_courrier_id,
      'Courrier imputé : ' || coalesce(v_courrier.numero, v_courrier.objet),
      'Vous êtes la personne réceptrice de l''entité à laquelle ce courrier vient d''être imputé.',
      'courrier',
      p_courrier_id
    );
  end if;

  if p_transition_id is not null then
    if v_courrier.workflow_instance_id is null then
      raise exception 'Courrier % sans instance de workflow', p_courrier_id;
    end if;
    perform app.fn_executer_transition(
      v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_entite_avant
    );
  end if;

  return v_courrier;
end;
$$;
