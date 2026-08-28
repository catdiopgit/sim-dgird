-- Gestion des courriers V3 (étape 5/8, cf. plan) : numérotation dynamique
-- intégrant le code de l'organisation et de l'entité traitante (ex.
-- 2026/DGDDI/DG/DIM/00002). Choix d'implémentation (cf. rapport de fin
-- d'étape) : plutôt que de déplacer la génération du numéro vers une
-- transition de workflow ultérieure — ce qui aurait exigé de rendre
-- courriers.numero nullable et complexifié l'UI de confirmation — le courrier
-- départ (assistant V3, étape 2 du plan) capture déjà l'entité en charge dès
-- la création. Le numéro peut donc être calculé immédiatement avec la bonne
-- entité, sans report : plus simple, moins risqué, même résultat fonctionnel.

alter table public.regles_numerotation
  add column niveau_racine_chemin integer;

create or replace function app.fn_generer_numero(
  p_organisation_id uuid,
  p_module_code text,
  p_entite_id uuid default null,
  p_valeur_liste_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_module_id uuid;
  v_regle record;
  v_annee text := to_char(current_date, 'YYYY');
  v_mois text := to_char(current_date, 'MM');
  v_doit_reinitialiser boolean := false;
  v_numero text;
  v_largeur int;
  v_org_code text;
  v_entite_code text;
  v_chemin_entite text;
begin
  select id into v_module_id from public.modules where code = p_module_code;
  if v_module_id is null then
    raise exception 'Module % introuvable', p_module_code;
  end if;

  -- Résolution en 3 paliers, du plus spécifique au plus générique: (1) règle
  -- propre à cette entité ET cette valeur de liste, (2) règle par sens/type
  -- (valeur_liste_id) commune à toutes les entités — le cas le plus courant,
  -- notamment le seed courrier_sens actuel — (3) règle par défaut du module.
  -- Nécessaire depuis que p_entite_id est systématiquement renseigné (0030):
  -- un simple "tout ou rien" sur (entite_id, valeur_liste_id) manquerait le
  -- palier 2 et casserait la résolution existante par sens.
  select * into v_regle
  from public.regles_numerotation
  where organisation_id = p_organisation_id
    and module_id = v_module_id
    and entite_id is not distinct from p_entite_id
    and valeur_liste_id is not distinct from p_valeur_liste_id
  for update;

  if not found and p_entite_id is not null then
    select * into v_regle
    from public.regles_numerotation
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and entite_id is null
      and valeur_liste_id is not distinct from p_valeur_liste_id
    for update;
  end if;

  if not found then
    select * into v_regle
    from public.regles_numerotation
    where organisation_id = p_organisation_id
      and module_id = v_module_id
      and entite_id is null
      and valeur_liste_id is null
    for update;
  end if;

  if not found then
    raise exception 'Aucune règle de numérotation pour le module % (organisation %)', p_module_code, p_organisation_id;
  end if;

  if v_regle.reinitialisation = 'annuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('year', v_regle.derniere_reinitialisation_le) <> date_trunc('year', current_date);
  elsif v_regle.reinitialisation = 'mensuelle' then
    v_doit_reinitialiser := v_regle.derniere_reinitialisation_le is null
      or date_trunc('month', v_regle.derniere_reinitialisation_le) <> date_trunc('month', current_date);
  end if;

  update public.regles_numerotation
  set sequence_courante = case when v_doit_reinitialiser then 1 else sequence_courante + 1 end,
      derniere_reinitialisation_le = case when v_doit_reinitialiser then current_date else derniere_reinitialisation_le end,
      updated_at = now()
  where id = v_regle.id
  returning sequence_courante into v_regle.sequence_courante;

  v_numero := v_regle.format;
  v_numero := replace(v_numero, '{ANNEE}', v_annee);
  v_numero := replace(v_numero, '{MOIS}', v_mois);

  if v_numero like '%{ORGANISATION}%' then
    select code into v_org_code from public.organisations where id = p_organisation_id;
    v_numero := replace(v_numero, '{ORGANISATION}', coalesce(v_org_code, ''));
  end if;

  if p_entite_id is not null and (v_numero like '%{ENTITE}%' or v_numero like '%{CHEMIN_ENTITE}%') then
    select code into v_entite_code from public.entites where id = p_entite_id;
    v_numero := replace(v_numero, '{ENTITE}', coalesce(v_entite_code, ''));

    if v_numero like '%{CHEMIN_ENTITE}%' then
      with recursive chaine as (
        select id, parent_entite_id, code, niveau from public.entites where id = p_entite_id
        union all
        select e.id, e.parent_entite_id, e.code, e.niveau
        from public.entites e
        join chaine c on e.id = c.parent_entite_id
      )
      select string_agg(code, '/' order by niveau) into v_chemin_entite
      from chaine
      where v_regle.niveau_racine_chemin is null or niveau >= v_regle.niveau_racine_chemin;

      v_numero := replace(v_numero, '{CHEMIN_ENTITE}', coalesce(v_chemin_entite, ''));
    end if;
  else
    v_numero := replace(v_numero, '{ENTITE}', '');
    v_numero := replace(v_numero, '{CHEMIN_ENTITE}', '');
  end if;

  if v_numero ~ '\{SEQ:\d+\}' then
    v_largeur := substring(v_numero from '\{SEQ:(\d+)\}')::int;
    v_numero := regexp_replace(v_numero, '\{SEQ:\d+\}', lpad(v_regle.sequence_courante::text, v_largeur, '0'));
  else
    v_numero := replace(v_numero, '{SEQ}', v_regle.sequence_courante::text);
  end if;

  return v_numero;
end;
$$;

grant execute on function app.fn_generer_numero(uuid, text, uuid, uuid) to authenticated;

-- fn_creer_courrier passait toujours null pour l'entité de numérotation
-- (0019/0026/0028) — désormais, l'entité effective (déjà résolue: paramètre
-- fourni ou routage initial) alimente {ENTITE}/{CHEMIN_ENTITE} si le format
-- configuré les utilise. Sans changement du format existant ({ANNEE}/{SEQ}...),
-- le comportement actuel est strictement inchangé.
create or replace function public.fn_creer_courrier(
  p_sens public.sens_courrier,
  p_objet text,
  p_entite_id uuid default null,
  p_type_valeur_id uuid default null,
  p_priorite_valeur_id uuid default null,
  p_confidentialite_valeur_id uuid default null,
  p_mode_transmission_valeur_id uuid default null,
  p_date_courrier date default current_date,
  p_date_reception timestamptz default null,
  p_date_envoi timestamptz default null,
  p_expediteur_nom text default null,
  p_expediteur_type_valeur_id uuid default null,
  p_destinataire_texte text default null,
  p_entite_destinataire_id uuid default null,
  p_agent_destinataire_id uuid default null,
  p_contact_destinataire_id uuid default null,
  p_observations text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_organisation_id uuid;
  v_sens_valeur_id uuid;
  v_entite_id uuid;
  v_numero text;
  v_workflow_instance_id uuid;
  v_etape_code text;
  v_etape_libelle text;
  v_courrier public.courriers;
begin
  v_organisation_id := app.current_organisation_id();
  if v_organisation_id is null then
    raise exception 'Utilisateur non rattaché à une organisation';
  end if;

  v_entite_id := p_entite_id;
  if v_entite_id is null then
    v_entite_id := (
      app.fn_parametre_organisation(v_organisation_id, 'courrier.entite_destinataire_initiale_id')
      #>> '{}'
    )::uuid;
  end if;

  if not app.has_permission('courrier', 'creer', v_entite_id) then
    raise exception 'Permission refusée (courrier/creer)';
  end if;

  select vl.id into v_sens_valeur_id
  from public.valeurs_listes vl
  join public.listes_valeurs lv on lv.id = vl.liste_id
  where lv.organisation_id = v_organisation_id
    and lv.code = 'courrier_sens'
    and vl.code = p_sens::text;

  if v_sens_valeur_id is null then
    raise exception 'Valeur de liste courrier_sens introuvable pour %', p_sens;
  end if;

  v_numero := app.fn_generer_numero(v_organisation_id, 'courrier', v_entite_id, v_sens_valeur_id);
  v_workflow_instance_id := app.fn_demarrer_workflow('courrier', v_organisation_id, auth.uid());

  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, mode_transmission_valeur_id, objet, date_courrier,
    date_reception, date_envoi, expediteur_nom, expediteur_type_valeur_id,
    destinataire_texte, entite_destinataire_id, agent_destinataire_id, contact_destinataire_id,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, v_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, p_expediteur_nom,
    p_expediteur_type_valeur_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, p_contact_destinataire_id,
    auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;
