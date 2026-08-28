-- 0077's fusion renommait/supprimait les étapes "retour"/"rapport-pv" mais
-- ne renumérotait pas les étapes suivantes : validation-rapport et cloture
-- gardaient leur ordre d'origine (8, 9) au lieu de (7, 8), laissant un trou
-- (1,2,3,4,5,6,8,9) sur les workflows déjà semés (organisations existantes).
-- Purement cosmétique (ordre n'est pas une clé, juste un tri d'affichage —
-- utile pour Administration > Workflows), mais corrigé pour rester propre.

update public.workflow_etapes we
set ordre = 7
from public.workflow_definitions wd
where we.workflow_definition_id = wd.id
  and wd.code = 'mission-standard'
  and we.code = 'validation-rapport';

update public.workflow_etapes we
set ordre = 8
from public.workflow_definitions wd
where we.workflow_definition_id = wd.id
  and wd.code = 'mission-standard'
  and we.code = 'cloture';
