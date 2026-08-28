-- Suite de 0047: la clôture du workflow à l'ajout de la décharge était
-- silencieuse côté timeline (aucune ligne workflow_historique créée), donc
-- invisible sur le panneau Workflow. On trace désormais explicitement
-- l'événement dans workflow_historique — transition_id volontairement null
-- (ce n'est pas une transition configurée soumise à workflow_transition_roles,
-- comme pour le verrouillage), étape précédente = étape suivante (l'instance
-- ne change pas d'étape, elle se termine sur place) — pour que la ligne
-- apparaisse à sa place chronologique réelle, après la dernière action de
-- traitement, avec la date et l'auteur de la décharge (utilisateur_id +
-- date_action déjà portés par la table, pas de colonne à ajouter).

create or replace function public.fn_ajouter_decharge_courrier(
  p_courrier_id uuid,
  p_storage_path text,
  p_nom_fichier text,
  p_taille_octets bigint default null,
  p_type_mime text default null
)
returns public.courriers
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_etape_courante_id uuid;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    raise exception 'Courrier % introuvable', p_courrier_id;
  end if;

  if v_courrier.organisation_id <> app.current_organisation_id() then
    raise exception 'Courrier % hors de l''organisation courante', p_courrier_id;
  end if;

  if v_courrier.verrouille_le is not null then
    raise exception 'Courrier % déjà verrouillé', p_courrier_id;
  end if;

  if not (
    v_courrier.created_by = auth.uid()
    or app.has_permission('courrier', 'modifier', v_courrier.entite_id)
  ) then
    raise exception 'Permission refusée sur le courrier %', p_courrier_id;
  end if;

  insert into public.courrier_pieces_jointes (
    courrier_id, storage_path, nom_fichier, taille_octets, type_mime, est_decharge, created_by
  ) values (
    p_courrier_id, p_storage_path, p_nom_fichier, p_taille_octets, p_type_mime, true, auth.uid()
  );

  update public.courriers
  set verrouille_le = now(), verrouille_par = auth.uid()
  where id = p_courrier_id
  returning * into v_courrier;

  if v_courrier.sens = 'sortant' and v_courrier.workflow_instance_id is not null then
    update public.workflow_instances
    set statut_instance = 'terminee', termine_le = now()
    where id = v_courrier.workflow_instance_id
      and statut_instance = 'en_cours'
    returning etape_courante_id into v_etape_courante_id;

    if v_etape_courante_id is not null then
      insert into public.workflow_historique (
        workflow_instance_id, transition_id, etape_precedente_id, etape_suivante_id, utilisateur_id, commentaire
      ) values (
        v_courrier.workflow_instance_id, null, v_etape_courante_id, v_etape_courante_id, auth.uid(),
        'Décharge ajoutée — courrier clôturé'
      );
    end if;
  end if;

  return v_courrier;
end;
$$;
