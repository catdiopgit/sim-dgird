-- fn_executer_transition_courrier (0039) appelait app.fn_executer_transition
-- sans p_entite_objet, alors que fn_transitions_disponibles_courrier (0042)
-- calcule la liste des transitions affichées en passant v_courrier.entite_id
-- à app.acteur_de_transition_autorise. Un acteur de type
-- 'responsable_entite_courante' ou 'superieur_hierarchique_courant' passait
-- donc le filtre d'affichage (entité présente) mais échouait à l'exécution
-- (entité absente, p_entite_objet = null) : "Utilisateur % non autorisé pour
-- la transition %" alors que le bouton était visible. Même signature ->
-- CREATE OR REPLACE suffit.

create or replace function public.fn_executer_transition_courrier(
  p_courrier_id uuid,
  p_transition_id uuid,
  p_commentaire text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_courrier record;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % verrouillé (décharge ajoutée) — aucune action de workflow possible', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  if v_courrier.workflow_instance_id is null then
    raise exception 'Courrier % sans instance de workflow', p_courrier_id;
  end if;

  perform app.fn_executer_transition(
    v_courrier.workflow_instance_id, p_transition_id, auth.uid(), p_commentaire, v_courrier.entite_id
  );
end;
$$;
