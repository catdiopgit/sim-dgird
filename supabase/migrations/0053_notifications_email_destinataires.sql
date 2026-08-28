-- Notifications par email sur les actions courrier (partie B) : étend qui est
-- notifié (créateur + destinataires en copie, en plus de l'existant — acteurs
-- de la prochaine étape, personne réceptrice à l'imputation) sur les actions
-- Enregistrement / Traitement / Imputation-Affectation-Transmission-Redirection
-- / Décharge-Clôture. L'envoi email lui-même (partie C) consomme ces mêmes
-- lignes notifications, sans logique dupliquée.

create or replace function app.fn_notifier_destinataires_courrier(
  p_courrier_id uuid,
  p_titre text,
  p_message text,
  p_exclure_utilisateur uuid default null,
  p_inclure_entite_et_copies boolean default true
)
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_courrier record;
  v_module_courrier_id uuid;
  v_destinataire uuid;
  v_deja_notifies uuid[] := array[]::uuid[];
  v_cd record;
begin
  select * into v_courrier from public.courriers where id = p_courrier_id;
  if not found then
    return;
  end if;

  select id into v_module_courrier_id from public.modules where code = 'courrier';

  if v_courrier.created_by is not null and v_courrier.created_by is distinct from p_exclure_utilisateur then
    insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
    values (v_courrier.created_by, v_module_courrier_id, p_titre, p_message, 'courrier', p_courrier_id);
    v_deja_notifies := v_deja_notifies || v_courrier.created_by;
  end if;

  if not p_inclure_entite_et_copies then
    return;
  end if;

  -- Responsable / personne réceptrice de l'entité actuellement en charge.
  if v_courrier.entite_id is not null then
    for v_destinataire in
      select unnest(array[e.responsable_utilisateur_id, e.personne_receptrice_id])
      from public.entites e
      where e.id = v_courrier.entite_id
    loop
      if v_destinataire is not null
        and v_destinataire is distinct from p_exclure_utilisateur
        and not (v_destinataire = any(v_deja_notifies))
      then
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (v_destinataire, v_module_courrier_id, p_titre, p_message, 'courrier', p_courrier_id);
        v_deja_notifies := v_deja_notifies || v_destinataire;
      end if;
    end loop;
  end if;

  -- Destinataires en copie : utilisateur direct, ou entité (résolue en
  -- responsable/personne réceptrice, même règle que ci-dessus).
  for v_cd in
    select * from public.courrier_destinataires
    where courrier_id = p_courrier_id and type_diffusion = 'copie'
  loop
    if v_cd.utilisateur_id is not null then
      if v_cd.utilisateur_id is distinct from p_exclure_utilisateur
        and not (v_cd.utilisateur_id = any(v_deja_notifies))
      then
        insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
        values (v_cd.utilisateur_id, v_module_courrier_id, p_titre, p_message, 'courrier', p_courrier_id);
        v_deja_notifies := v_deja_notifies || v_cd.utilisateur_id;
      end if;
    elsif v_cd.entite_id is not null then
      for v_destinataire in
        select unnest(array[e.responsable_utilisateur_id, e.personne_receptrice_id])
        from public.entites e
        where e.id = v_cd.entite_id
      loop
        if v_destinataire is not null
          and v_destinataire is distinct from p_exclure_utilisateur
          and not (v_destinataire = any(v_deja_notifies))
        then
          insert into public.notifications (destinataire_id, module_id, titre, message, objet_module, objet_id)
          values (v_destinataire, v_module_courrier_id, p_titre, p_message, 'courrier', p_courrier_id);
          v_deja_notifies := v_deja_notifies || v_destinataire;
        end if;
      end loop;
    end if;
  end loop;
end;
$$;

-- app.fn_notifier_transition (0020) : reste générique courrier/ged/missions —
-- ajoute uniquement une notification "mise à jour" au créateur (jamais aux
-- acteurs de l'étape suivante, déjà couverts juste au-dessus, ni aux copies,
-- spécifiques au courrier). Le titre "Action requise" reste réservé aux
-- acteurs qui doivent agir ; celui-ci est volontairement différent.
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
    from public.documents where workflow_instance_id = new.workflow_instance_id;
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
