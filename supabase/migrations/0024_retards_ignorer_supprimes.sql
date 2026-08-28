-- Corrige un gap découvert en test manuel: le scan de retards notifiait même
-- pour un courrier/document déjà supprimé (soft delete via supprime_le), car
-- workflow_instances.statut_instance reste 'en_cours' après une suppression
-- (la suppression n'agit pas sur le workflow). On exclut désormais les objets
-- portant un supprime_le non nul.

create or replace function app.fn_detecter_et_notifier_retards()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_instance record;
  v_objet_module text;
  v_objet_id uuid;
  v_entite_objet uuid;
  v_supprime_le timestamptz;
  v_jours_retard integer;
  v_acteur record;
  v_destinataire uuid;
  v_superieur uuid;
  v_deja_notifie boolean;
  v_nb_notifiees integer := 0;
begin
  for v_instance in
    select wi.id as instance_id, wi.etape_courante_id, we.libelle as etape_libelle, we.delai_jours,
           wi.etape_courante_depuis
    from public.workflow_instances wi
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where wi.statut_instance = 'en_cours'
      and we.delai_jours is not null
      and wi.etape_courante_depuis + (we.delai_jours || ' days')::interval < now()
  loop
    v_objet_module := null;
    v_objet_id := null;
    v_entite_objet := null;
    v_supprime_le := null;

    select id, entite_id, supprime_le into v_objet_id, v_entite_objet, v_supprime_le
    from public.courriers where workflow_instance_id = v_instance.instance_id;
    if found then
      v_objet_module := 'courrier';
    else
      select id, entite_id, supprime_le into v_objet_id, v_entite_objet, v_supprime_le
      from public.documents where workflow_instance_id = v_instance.instance_id;
      if found then
        v_objet_module := 'ged';
      else
        select id, entite_id into v_objet_id, v_entite_objet
        from public.missions where workflow_instance_id = v_instance.instance_id;
        if found then
          v_objet_module := 'missions';
        end if;
      end if;
    end if;

    if v_objet_id is null or v_supprime_le is not null then
      continue;
    end if;

    select exists (
      select 1 from public.notifications
      where objet_module = v_objet_module
        and objet_id = v_objet_id
        and titre like 'Retard :%'
        and created_at::date = current_date
    ) into v_deja_notifie;
    if v_deja_notifie then
      continue;
    end if;

    v_jours_retard := floor(extract(epoch from (now() - v_instance.etape_courante_depuis)) / 86400)::integer;

    for v_acteur in
      select distinct wtr.*
      from public.workflow_transitions wt
      join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
      where wt.etape_source_id = v_instance.etape_courante_id
    loop
      for v_destinataire in
        select u.id from public.utilisateurs u
        where (v_acteur.type_acteur = 'role' and exists (
                select 1 from public.utilisateur_roles ur
                where ur.utilisateur_id = u.id and ur.role_id = v_acteur.role_id
                  and (ur.date_fin is null or ur.date_fin >= current_date)
              ))
           or (v_acteur.type_acteur = 'fonction' and u.fonction_id = v_acteur.fonction_id)
           or (v_acteur.type_acteur = 'entite' and u.entite_id = v_acteur.entite_id)
           or (v_acteur.type_acteur = 'entite_et_descendants' and exists (
                select 1 from public.entites cible
                join public.entites racine on racine.id = v_acteur.entite_id
                where cible.id = u.entite_id and racine.chemin @> cible.chemin
              ))
           or (v_acteur.type_acteur = 'utilisateur' and u.id = v_acteur.utilisateur_id)
           or (v_acteur.type_acteur = 'responsable_entite_courante' and v_entite_objet is not null and exists (
                select 1 from public.entites e where e.id = v_entite_objet and e.responsable_utilisateur_id = u.id
              ))
           or (v_acteur.type_acteur = 'superieur_hierarchique_courant' and v_entite_objet is not null and exists (
                select 1 from public.entites e join public.entites parent on parent.id = e.parent_entite_id
                where e.id = v_entite_objet and parent.responsable_utilisateur_id = u.id
              ))
      loop
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_destinataire,
          (select id from public.modules where code = v_objet_module),
          'Retard : ' || v_instance.etape_libelle,
          'En attente depuis ' || v_jours_retard || ' jour(s), délai dépassé.',
          v_objet_module,
          v_objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end loop;
    end loop;

    if v_entite_objet is not null then
      select parent.responsable_utilisateur_id into v_superieur
      from public.entites e
      join public.entites parent on parent.id = e.parent_entite_id
      where e.id = v_entite_objet;

      if v_superieur is not null then
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_superieur,
          (select id from public.modules where code = v_objet_module),
          'Retard : ' || v_instance.etape_libelle,
          'Escalade — en attente depuis ' || v_jours_retard || ' jour(s) sans action, délai dépassé.',
          v_objet_module,
          v_objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end if;
    end if;
  end loop;

  return v_nb_notifiees;
end;
$$;
