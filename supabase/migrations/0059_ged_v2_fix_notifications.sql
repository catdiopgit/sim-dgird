-- Correctif GED V2: app.fn_notifier_transition (trigger sur workflow_historique,
-- dernière version 0053) et app.fn_detecter_et_notifier_retards (0022)
-- référençaient encore public.documents.workflow_instance_id, colonne retirée
-- par 0057 (le workflow porte désormais sur ged_versements). Reponte les deux
-- fonctions sur ged_versements — l'objet notifié devient le versement,
-- cohérent avec la nouvelle route /ged/versements/:id. Corps repris de 0053
-- (dernière définition en date), seule la branche GED change.

create or replace function app.fn_notifier_transition()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_objet_module text;
  v_objet_id uuid;
  v_entite_objet uuid;
  v_etape_libelle text;
  v_acteur record;
  v_destinataire uuid;
begin
  if new.transition_id is null then
    return new;
  end if;

  select id, entite_id into v_objet_id, v_entite_objet
  from public.courriers where workflow_instance_id = new.workflow_instance_id;
  if found then
    v_objet_module := 'courrier';
  else
    select id, entite_id into v_objet_id, v_entite_objet
    from public.ged_versements where workflow_instance_id = new.workflow_instance_id;
    if found then
      v_objet_module := 'ged';
    else
      select id, entite_id into v_objet_id, v_entite_objet
      from public.missions where workflow_instance_id = new.workflow_instance_id;
      if found then
        v_objet_module := 'missions';
      end if;
    end if;
  end if;

  if v_objet_id is null then
    return new;
  end if;

  select libelle into v_etape_libelle from public.workflow_etapes where id = new.etape_suivante_id;

  for v_acteur in
    select distinct wtr.*
    from public.workflow_transitions wt
    join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
    where wt.etape_source_id = new.etape_suivante_id
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
        'Action requise : ' || coalesce(v_etape_libelle, ''),
        new.commentaire,
        v_objet_module,
        v_objet_id
      );
    end loop;
  end loop;

  if v_objet_module = 'courrier' then
    perform app.fn_notifier_destinataires_courrier(
      v_objet_id,
      'Mise à jour : ' || coalesce(v_etape_libelle, ''),
      new.commentaire,
      new.utilisateur_id,
      false
    );
  end if;

  return new;
end;
$$;

create or replace function app.fn_detecter_et_notifier_retards()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_instance record;
  v_echeance_row record;
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
      from public.ged_versements where workflow_instance_id = v_instance.instance_id;
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

  -- Échéances de courrier_destinataires (imputation/affectation/transmission/
  -- redirection) dépassées, indépendamment du délai statique de l'étape —
  -- inchangé (spécifique Courrier, cf. 0042), reconduit tel quel.
  for v_echeance_row in
    select c.id as objet_id, c.entite_id as entite_objet, wi.etape_courante_id, we.libelle as etape_libelle,
           cd.echeance
    from public.courrier_destinataires cd
    join public.courriers c on c.id = cd.courrier_id
    join public.workflow_instances wi on wi.id = c.workflow_instance_id
    join public.workflow_etapes we on we.id = wi.etape_courante_id
    where cd.type_diffusion = 'principal'
      and cd.echeance is not null
      and cd.echeance < current_date
      and wi.statut_instance = 'en_cours'
      and c.supprime_le is null
  loop
    select exists (
      select 1 from public.notifications
      where objet_module = 'courrier'
        and objet_id = v_echeance_row.objet_id
        and titre like 'Retard :%'
        and created_at::date = current_date
    ) into v_deja_notifie;
    if v_deja_notifie then
      continue;
    end if;

    v_jours_retard := (current_date - v_echeance_row.echeance);

    for v_acteur in
      select distinct wtr.*
      from public.workflow_transitions wt
      join public.workflow_transition_roles wtr on wtr.workflow_transition_id = wt.id
      where wt.etape_source_id = v_echeance_row.etape_courante_id
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
           or (v_acteur.type_acteur = 'responsable_entite_courante' and v_echeance_row.entite_objet is not null and exists (
                select 1 from public.entites e where e.id = v_echeance_row.entite_objet and e.responsable_utilisateur_id = u.id
              ))
           or (v_acteur.type_acteur = 'superieur_hierarchique_courant' and v_echeance_row.entite_objet is not null and exists (
                select 1 from public.entites e join public.entites parent on parent.id = e.parent_entite_id
                where e.id = v_echeance_row.entite_objet and parent.responsable_utilisateur_id = u.id
              ))
      loop
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (
          v_destinataire,
          (select id from public.modules where code = 'courrier'),
          'Retard : ' || v_echeance_row.etape_libelle,
          'Échéance dépassée depuis ' || v_jours_retard || ' jour(s).',
          'courrier',
          v_echeance_row.objet_id
        );
        v_nb_notifiees := v_nb_notifiees + 1;
      end loop;
    end loop;
  end loop;

  return v_nb_notifiees;
end;
$$;
