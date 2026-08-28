-- Gestion des courriers V4 (étape 1/7, cf. plan) : personne réceptrice
-- configurée au niveau de l'entité (et non plus saisie sur chaque courrier
-- via "Agent destinataire"), et statut du courrier à sa réception.

alter table public.entites
  add column personne_receptrice_id uuid references public.utilisateurs(id) on delete set null;

alter table public.courriers
  add column statut_reception_valeur_id uuid references public.valeurs_listes(id) on delete set null;

-- Nouvelle liste de valeurs "statut à la réception". Urgent/Confidentiel ne
-- sont pas dupliqués ici: déjà couverts par courrier_priorite/
-- courrier_confidentialite (cf. analyse V4 §3).
insert into public.listes_valeurs (organisation_id, code, libelle, module_id)
select o.id, 'courrier_statut_reception', 'Statut à la réception', m.id
from public.organisations o
join public.modules m on m.code = 'courrier'
where not exists (
  select 1 from public.listes_valeurs lv
  where lv.organisation_id = o.id and lv.code = 'courrier_statut_reception'
);

insert into public.valeurs_listes (liste_id, code, libelle, couleur, ordre, valeur_defaut)
select lv.id, v.code, v.libelle, v.couleur, v.ordre, v.valeur_defaut
from public.listes_valeurs lv
cross join (values
  ('recu', 'Reçu', 'green', 1, true),
  ('recu-avec-reserves', 'Reçu avec réserves', 'orange', 2, false),
  ('incomplet', 'Incomplet', 'red', 3, false),
  ('a-verifier', 'À vérifier', 'gold', 4, false)
) as v(code, libelle, couleur, ordre, valeur_defaut)
where lv.code = 'courrier_statut_reception'
  and not exists (
    select 1 from public.valeurs_listes existant
    where existant.liste_id = lv.id and existant.code = v.code
  );

-- fn_creer_courrier: + p_statut_reception_valeur_id (trailing, DROP requis —
-- même remarque que 0026/0028/0030: ajouter un paramètre change la liste de
-- types, CREATE OR REPLACE créerait un second overload au lieu de remplacer).
drop function if exists public.fn_creer_courrier(
  public.sens_courrier, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, uuid, text
);

create function public.fn_creer_courrier(
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
  p_statut_reception_valeur_id uuid default null,
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
    statut_reception_valeur_id,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, v_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, p_expediteur_nom,
    p_expediteur_type_valeur_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, p_contact_destinataire_id, p_statut_reception_valeur_id,
    auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_creer_courrier(
  public.sens_courrier, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, uuid, uuid, text
) to authenticated;
