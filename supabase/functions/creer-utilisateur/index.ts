// Crée un compte Supabase Auth + le profil métier associé (public.utilisateurs).
// Nécessite la clé service_role (jamais exposée au frontend) pour
// auth.admin.createUser — c'est pourquoi cette opération passe par une Edge
// Function plutôt que par le client SPA.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Payload {
  email: string;
  nom: string;
  prenom: string;
  entiteId?: string | null;
  fonctionId?: string | null;
  matricule?: string | null;
  telephone?: string | null;
}

function genererMotDePasseTemporaire(): string {
  const majuscules = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minuscules = 'abcdefghjkmnpqrstuvwxyz';
  const chiffres = '23456789';
  const symboles = '!@#$%';
  const alphabet = majuscules + minuscules + chiffres + symboles;
  const octets = new Uint32Array(14);
  crypto.getRandomValues(octets);
  let mot = '';
  for (let i = 0; i < octets.length; i++) {
    mot += alphabet[octets[i] % alphabet.length];
  }
  // Garantit la présence d'au moins un caractère de chaque classe.
  return (
    majuscules[octets[0] % majuscules.length] +
    minuscules[octets[1] % minuscules.length] +
    chiffres[octets[2] % chiffres.length] +
    symboles[octets[3] % symboles.length] +
    mot.slice(4)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization') ?? '';

    // Client "appelant" : soumis à RLS, ne sert qu'à vérifier qui appelle et
    // avec quelles permissions — jamais utilisé pour les écritures privilégiées.
    const supabaseAppelant = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Client privilégié : bypass RLS, utilisé uniquement après vérification.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: appelant },
    } = await supabaseAppelant.auth.getUser();
    if (!appelant) {
      return reponseErreur('Authentification requise.', 401);
    }

    const { data: profilAppelant, error: profilError } = await supabaseAppelant
      .from('utilisateurs')
      .select('organisation_id, entite_id')
      .eq('id', appelant.id)
      .single();
    if (profilError || !profilAppelant) {
      return reponseErreur('Profil appelant introuvable.', 403);
    }

    const payload = (await req.json()) as Payload;
    if (!payload.email || !payload.nom || !payload.prenom) {
      return reponseErreur('email, nom et prenom sont requis.', 400);
    }

    const autorise = await appelantPeutCreerUtilisateur(
      supabaseAppelant,
      appelant.id,
      payload.entiteId ?? null,
    );
    if (!autorise) {
      return reponseErreur("Permission refusée (utilisateurs/creer).", 403);
    }

    const motDePasseTemporaire = genererMotDePasseTemporaire();

    const { data: nouveauCompte, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email,
      password: motDePasseTemporaire,
      email_confirm: true,
    });
    if (createError || !nouveauCompte.user) {
      return reponseErreur(createError?.message ?? 'Échec de création du compte.', 400);
    }

    const { error: insertError } = await supabaseAdmin.from('utilisateurs').insert({
      id: nouveauCompte.user.id,
      organisation_id: profilAppelant.organisation_id,
      entite_id: payload.entiteId ?? null,
      fonction_id: payload.fonctionId ?? null,
      matricule: payload.matricule ?? null,
      telephone: payload.telephone ?? null,
      nom: payload.nom,
      prenom: payload.prenom,
      email: payload.email,
    });
    if (insertError) {
      // Évite un compte Auth orphelin sans profil métier.
      await supabaseAdmin.auth.admin.deleteUser(nouveauCompte.user.id);
      return reponseErreur(`Échec de création du profil : ${insertError.message}`, 400);
    }

    return new Response(
      JSON.stringify({
        id: nouveauCompte.user.id,
        email: payload.email,
        motDePasseTemporaire,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return reponseErreur(err instanceof Error ? err.message : 'Erreur inattendue.', 500);
  }
});

function reponseErreur(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Réévalue app.has_permission('utilisateurs', 'creer', entiteId) côté serveur,
// via des requêtes soumises à RLS (donc dignes de confiance) plutôt qu'un appel
// RPC vers le schéma `app` (non exposé publiquement par PostgREST).
async function appelantPeutCreerUtilisateur(
  // deno-lint-ignore no-explicit-any
  supabaseAppelant: any,
  appelantId: string,
  entiteCible: string | null,
): Promise<boolean> {
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const { data: rolesRows } = await supabaseAppelant
    .from('utilisateur_roles')
    .select('role_id, entite_id, date_fin')
    .eq('utilisateur_id', appelantId)
    .or(`date_fin.is.null,date_fin.gte.${aujourdHui}`);

  const roleIds = [...new Set((rolesRows ?? []).map((r: { role_id: string }) => r.role_id))];
  if (roleIds.length === 0) return false;

  const { data: permRows } = await supabaseAppelant
    .from('permissions')
    .select('role_id, portee, modules(code), actions(code)')
    .in('role_id', roleIds);

  const permissionsUtilisateursCreer = (permRows ?? []).filter(
    (p: { modules: { code: string } | null; actions: { code: string } | null }) =>
      p.modules?.code === 'utilisateurs' && p.actions?.code === 'creer',
  );
  if (permissionsUtilisateursCreer.length === 0) return false;

  let entitesParId: Map<string, string | null> | null = null;
  const chargerEntites = async () => {
    if (entitesParId) return entitesParId;
    const { data: entiteRows } = await supabaseAppelant.from('entites').select('id, parent_entite_id');
    entitesParId = new Map((entiteRows ?? []).map((e: { id: string; parent_entite_id: string | null }) => [e.id, e.parent_entite_id]));
    return entitesParId;
  };

  for (const ur of rolesRows ?? []) {
    const permsDuRole = permissionsUtilisateursCreer.filter(
      (p: { role_id: string }) => p.role_id === ur.role_id,
    );
    for (const p of permsDuRole) {
      if (p.portee === 'organisation' || p.portee === 'personnel') return true;
      if (!entiteCible || !ur.entite_id) continue;
      if (p.portee === 'entite' && ur.entite_id === entiteCible) return true;
      if (p.portee === 'entite_et_descendants') {
        const carte = await chargerEntites();
        if (estDescendantOuSoi(entiteCible, ur.entite_id, carte)) return true;
      }
    }
  }
  return false;
}

function estDescendantOuSoi(
  candidatId: string,
  ancetreId: string,
  parentParId: Map<string, string | null>,
): boolean {
  let courant: string | null = candidatId;
  const visites = new Set<string>();
  while (courant) {
    if (courant === ancetreId) return true;
    if (visites.has(courant)) return false;
    visites.add(courant);
    courant = parentParId.get(courant) ?? null;
  }
  return false;
}
