// Détection des retards de workflow (§7 du cahier des charges workflow V2) :
// scanne les instances en cours dont l'étape courante dépasse son délai, et
// notifie (relance + escalade au supérieur hiérarchique) via
// public.fn_detecter_et_notifier_retards (migration 0022/0023).
//
// Cette fonction ne fait aucun scan elle-même — toute la logique vit en SQL,
// au même endroit que le reste du moteur de workflow (app.fn_executer_transition,
// app.fn_notifier_transition...). Son seul rôle est d'être l'horloge : elle doit
// être appelée périodiquement.
//
// Planification : aucune dépendance à pg_cron côté base (non garanti disponible
// sur tous les projets). À configurer depuis le tableau de bord Supabase >
// Edge Functions > detecter-retards-workflow > Cron Jobs, avec l'en-tête
// `Authorization: Bearer <service_role key>` et une fréquence horaire
// (`0 * * * *`) — le scan lui-même est idempotent (une seule notification par
// objet et par jour), une fréquence plus fine ne fait pas de doublon.

import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase.rpc('fn_detecter_et_notifier_retards');
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ notifications_envoyees: data }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
