-- Logo (Administration > Organisation) et logo droit / armoiries (Administration
-- > Paramétrage > En-tête document) : jusqu'ici de simples champs URL, remplacés
-- par un vrai sélecteur de fichier côté UI. Bucket public dédié (contrairement à
-- courrier-pieces-jointes, 0019, privé) — ce sont des images de marque affichées
-- publiquement sur les fiches imprimées, pas des documents à accès restreint ;
-- un lien public simple évite de régénérer des URL signées à chaque affichage.

insert into storage.buckets (id, name, public)
values ('organisation-images', 'organisation-images', true)
on conflict (id) do nothing;

-- Convention de chemin: {organisation_id}/{uuid}-{nom_fichier} — même
-- principe que courrier-pieces-jointes (storage.foldername(name)[1]).
create policy organisation_images_storage_select on storage.objects
  for select using (bucket_id = 'organisation-images');

create policy organisation_images_storage_insert on storage.objects
  for insert with check (
    bucket_id = 'organisation-images'
    and (storage.foldername(name))[1]::uuid = app.current_organisation_id()
    and app.has_permission('administration', 'modifier')
  );

create policy organisation_images_storage_update on storage.objects
  for update using (
    bucket_id = 'organisation-images'
    and (storage.foldername(name))[1]::uuid = app.current_organisation_id()
    and app.has_permission('administration', 'modifier')
  );

create policy organisation_images_storage_delete on storage.objects
  for delete using (
    bucket_id = 'organisation-images'
    and (storage.foldername(name))[1]::uuid = app.current_organisation_id()
    and app.has_permission('administration', 'modifier')
  );
