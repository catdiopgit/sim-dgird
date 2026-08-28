// Envoi par email des notifications déjà générées par le moteur de workflow
// (public.notifications, alimentée entre autres par app.fn_notifier_transition
// et app.fn_notifier_destinataires_courrier — cf. migrations 0053/0054). Cette
// fonction ne décide jamais QUI notifier ni POURQUOI — toute cette logique
// vit en SQL, au même endroit que le reste du moteur de workflow. Son seul
// rôle est la livraison : lire les notifications en attente (envoye_le is
// null), les envoyer via le compte SMTP configuré par organisation
// (public.parametres_smtp, Administration > Paramétrage > Notifications SMTP),
// et marquer envoye_le. Une notification dont l'organisation n'a pas encore
// configuré de SMTP actif reste simplement en attente — reprise
// automatiquement dès qu'un compte SMTP est configuré, sans traitement
// spécial.
//
// Planification : aucune dépendance à pg_cron côté base (même principe que
// detecter-retards-workflow) — à configurer depuis le tableau de bord
// Supabase > Edge Functions > envoyer-notifications-email > Cron Jobs, avec
// l'en-tête `Authorization: Bearer <service_role key>` et une fréquence de
// quelques minutes (ex. `*/5 * * * *`). Idempotent : une notification déjà
// envoyée (envoye_le renseigné) n'est plus reprise.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

interface NotificationRow {
  id: string;
  destinataire_id: string;
  titre: string;
  message: string | null;
  objet_module: string | null;
  objet_id: string | null;
  utilisateurs: { email: string; organisation_id: string } | null;
}

interface ParametresSmtp {
  organisation_id: string;
  hote: string;
  port: number;
  securite: string;
  utilisateur: string;
  mot_de_passe: string | null;
  adresse_expediteur: string;
  nom_expediteur: string | null;
  actif: boolean;
}

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

  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('id, destinataire_id, titre, message, objet_module, objet_id, utilisateurs!inner(email, organisation_id)')
    .is('envoye_le', null)
    .order('created_at', { ascending: true })
    .limit(200);
  if (notifError) {
    return new Response(JSON.stringify({ error: notifError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parNotification = (notifications ?? []) as unknown as NotificationRow[];
  const parOrganisation = new Map<string, NotificationRow[]>();
  for (const n of parNotification) {
    if (!n.utilisateurs) continue;
    const liste = parOrganisation.get(n.utilisateurs.organisation_id) ?? [];
    liste.push(n);
    parOrganisation.set(n.utilisateurs.organisation_id, liste);
  }

  let envoyees = 0;
  let echouees = 0;
  const idsEnvoyes: string[] = [];

  for (const [organisationId, lignes] of parOrganisation) {
    const { data: smtp } = await supabase
      .from('parametres_smtp')
      .select('organisation_id, hote, port, securite, utilisateur, mot_de_passe, adresse_expediteur, nom_expediteur, actif')
      .eq('organisation_id', organisationId)
      .maybeSingle<ParametresSmtp>();

    if (!smtp || !smtp.actif || !smtp.mot_de_passe) continue;

    const client = new SMTPClient({
      connection: {
        hostname: smtp.hote,
        port: smtp.port,
        tls: smtp.securite === 'ssl',
        auth: { username: smtp.utilisateur, password: smtp.mot_de_passe },
      },
    });

    for (const n of lignes) {
      if (!n.utilisateurs) continue;
      try {
        await client.send({
          from: smtp.nom_expediteur ? `${smtp.nom_expediteur} <${smtp.adresse_expediteur}>` : smtp.adresse_expediteur,
          to: n.utilisateurs.email,
          subject: n.titre,
          content: n.message ?? n.titre,
        });
        idsEnvoyes.push(n.id);
        envoyees++;
      } catch (err) {
        echouees++;
        console.error(`Échec envoi notification ${n.id} à ${n.utilisateurs.email}:`, err);
      }
    }

    await client.close();
  }

  if (idsEnvoyes.length > 0) {
    await supabase.from('notifications').update({ envoye_le: new Date().toISOString() }).in('id', idsEnvoyes);
  }

  return new Response(JSON.stringify({ envoyees, echouees, en_attente: parNotification.length - envoyees - echouees }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
