-- Gestion des courriers V3 (étape 1/8, cf. plan) : l'entité en charge d'un
-- courrier ne doit plus être obligatoirement choisie à la création — pour un
-- courrier arrivé notamment, elle doit être déterminée automatiquement par un
-- paramètre d'organisation (routage initial), l'affectation réelle intervenant
-- ensuite via le workflow (étape "Imputation", cf. étape 4 du plan).

alter table public.courriers alter column entite_id drop not null;

-- Petit accesseur générique pour parametres_organisation (magasin clé/valeur
-- déjà existant, 0007_parametrage_generique.sql, jusqu'ici jamais lu par du
-- code applicatif). Réutilisable au-delà du seul routage courrier.
create or replace function app.fn_parametre_organisation(p_organisation_id uuid, p_cle text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select valeur from public.parametres_organisation
  where organisation_id = p_organisation_id and cle = p_cle;
$$;

-- Signature élargie (p_entite_id devient optionnel) : DROP explicite requis,
-- pas seulement CREATE OR REPLACE, car réordonner les paramètres positionnels
-- créerait un second overload au lieu de remplacer l'existant (même piège que
-- app.fn_executer_transition en 0020_workflow_v2.sql).
drop function if exists public.fn_creer_courrier(
  uuid, public.sens_courrier, text, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, text
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

  -- Routage initial: si l'appelant ne précise pas d'entité (cas du courrier
  -- arrivé, qui ne doit pas la demander à l'enregistrement), on la déduit du
  -- paramètre d'organisation "courrier.entite_destinataire_initiale_id". Si
  -- l'appelant fournit une entité (sortant/interne, ou arrivé avec routage non
  -- configuré), elle prime.
  v_entite_id := p_entite_id;
  if v_entite_id is null then
    v_entite_id := (
      app.fn_parametre_organisation(v_organisation_id, 'courrier.entite_destinataire_initiale_id')
      #>> '{}'
    )::uuid;
  end if;

  -- SECURITY DEFINER contourne RLS: on revérifie nous-mêmes la permission
  -- plutôt que de faire confiance à un contrôle côté client. Vérifiée sur
  -- l'entité effective (résolue ci-dessus), pas sur le paramètre brut.
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

  v_numero := app.fn_generer_numero(v_organisation_id, 'courrier', null, v_sens_valeur_id);
  v_workflow_instance_id := app.fn_demarrer_workflow('courrier', v_organisation_id, auth.uid());

  -- L'étape initiale n'est pas codée en dur: lue depuis l'instance qui vient
  -- d'être démarrée (le trigger app.sync_etape_cache ne peut pas encore avoir
  -- agi puisque la ligne courriers n'existe pas au moment de l'appel ci-dessus).
  select we.code, we.libelle
  into v_etape_code, v_etape_libelle
  from public.workflow_instances wi
  join public.workflow_etapes we on we.id = wi.etape_courante_id
  where wi.id = v_workflow_instance_id;

  insert into public.courriers (
    organisation_id, entite_id, sens, numero, type_valeur_id, priorite_valeur_id,
    confidentialite_valeur_id, mode_transmission_valeur_id, objet, date_courrier,
    date_reception, date_envoi, expediteur_nom, expediteur_type_valeur_id,
    destinataire_texte, entite_destinataire_id, agent_destinataire_id,
    redacteur_id, workflow_instance_id, etape_code, etape_libelle, observations, created_by
  ) values (
    v_organisation_id, v_entite_id, p_sens, v_numero, p_type_valeur_id,
    p_priorite_valeur_id, p_confidentialite_valeur_id, p_mode_transmission_valeur_id, p_objet,
    coalesce(p_date_courrier, current_date), p_date_reception, p_date_envoi, p_expediteur_nom,
    p_expediteur_type_valeur_id, p_destinataire_texte, p_entite_destinataire_id,
    p_agent_destinataire_id, auth.uid(), v_workflow_instance_id, v_etape_code, v_etape_libelle,
    p_observations, auth.uid()
  )
  returning * into v_courrier;

  return v_courrier;
end;
$$;

grant execute on function public.fn_creer_courrier(
  public.sens_courrier, text, uuid, uuid, uuid, uuid, uuid, date, timestamptz, timestamptz,
  text, uuid, text, uuid, uuid, text
) to authenticated;
