-- Remplace "Sponsor" (sélection d'un utilisateur) par "Financement" (texte
-- libre : bailleur, ligne budgétaire, etc. — pas forcément une personne du
-- système). Aucune donnée existante à préserver (colonne encore vide en
-- pratique) : simple renommage + changement de type, sans migration de valeurs.
alter table public.projets drop constraint if exists projets_sponsor_id_fkey;
alter table public.projets alter column sponsor_id type text using null::text;
alter table public.projets rename column sponsor_id to financement;
