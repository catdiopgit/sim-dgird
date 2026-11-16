import { CheckCheck, ChevronDown, ChevronRight, Clock, Eye, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useContacts } from '../../hooks/courrier/useContacts';
import { useDestinataires, usePriseConnaissanceCourrier } from '../../hooks/courrier/useDestinataires';
import type { Courrier } from '../../services/courrier/courriers';
import type { Destinataire } from '../../services/courrier/destinataires';
import { fr } from '../../utils/dateFr';
import { agentsDuPerimetre, type PorteeDiffusion } from './perimetreDiffusion';

interface Props {
  courrier: Courrier;
  organisationId: string;
  utilisateurId: string | undefined;
}

interface Ligne {
  id: string;
  libelle: string;
  nature: string;
  date: string | null;
  concerne: boolean;
  // Ligne d'entité diffusée à son personnel : regroupe les agents (lignes
  // nominatives générées à la diffusion, ou aperçu avant la diffusion).
  groupe: boolean;
  membres: Ligne[];
}

const LIBELLE_PORTEE: Record<Exclude<PorteeDiffusion, 'responsable'>, string> = {
  entite: 'Tout le personnel',
  entite_et_descendants: 'Personnel et sous-entités',
};

// Recette 2026-11 : destinataires d'une note interne (diffusion pour information)
// ou ampliataires d'un départ, avec le suivi de la prise de connaissance.
// v8.1-v8.2 : une entité peut recevoir la note pour tout son personnel ; la
// ligne d'entité se déplie sur les agents (aperçu avant la diffusion, puis
// liste réelle avec le suivi de lecture de chacun).
export function CourrierDiffusionCard({ courrier, organisationId, utilisateurId }: Props) {
  const { data: destinataires } = useDestinataires(courrier.id);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const priseConnaissance = usePriseConnaissanceCourrier(courrier.id);
  const estInterne = courrier.sens === 'interne';
  const avantDiffusion = estInterne && courrier.etape_code === 'enregistre';

  const { lignes, total, lus, aLire } = useMemo(() => {
    const entiteParId = new Map((entites ?? []).map((e) => [e.id, e]));
    const nomUtilisateur = new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`]));
    const nomContact = new Map((contacts ?? []).map((c) => [c.id, c.nom]));
    const retenus = (destinataires ?? []).filter((d) => estInterne || d.type_diffusion === 'copie');
    const enfants = new Map<string, Destinataire[]>();
    for (const d of retenus) {
      if (d.destinataire_parent_id) {
        enfants.set(d.destinataire_parent_id, [...(enfants.get(d.destinataire_parent_id) ?? []), d]);
      }
    }

    const versLigne = (d: Destinataire): Ligne => {
      const e = d.entite_id ? entiteParId.get(d.entite_id) : undefined;
      const libelle = d.utilisateur_id
        ? (nomUtilisateur.get(d.utilisateur_id) ?? '—')
        : e
          ? `${e.sigle ? `${e.sigle} — ` : ''}${e.libelle}`
          : d.contact_id
            ? (nomContact.get(d.contact_id) ?? '—')
            : '—';
      const groupe = !!d.entite_id && !!d.portee_diffusion && d.portee_diffusion !== 'responsable';
      const concerne =
        !groupe &&
        !!utilisateurId &&
        (d.utilisateur_id
          ? d.utilisateur_id === utilisateurId
          : !!e && (e.responsable_utilisateur_id === utilisateurId || e.personne_receptrice_id === utilisateurId));
      const membres: Ligne[] = groupe
        ? avantDiffusion
          ? agentsDuPerimetre(d.entite_id!, d.portee_diffusion, entites, utilisateurs)
              .filter((u) => u.id !== courrier.created_by)
              .map((u) => ({
                id: `apercu-${d.id}-${u.id}`,
                libelle: `${u.prenom} ${u.nom}`,
                nature: 'Personne',
                date: null,
                concerne: false,
                groupe: false,
                membres: [],
              }))
          : (enfants.get(d.id) ?? []).map(versLigne)
        : [];
      return {
        id: d.id,
        libelle,
        nature: groupe
          ? LIBELLE_PORTEE[d.portee_diffusion as Exclude<PorteeDiffusion, 'responsable'>]
          : d.utilisateur_id
            ? 'Personne'
            : d.entite_id
              ? 'Entité (responsable)'
              : 'Contact',
        date: d.date_prise_connaissance,
        concerne,
        groupe,
        membres,
      };
    };

    const racines = retenus.filter((d) => !d.destinataire_parent_id).map(versLigne);
    const individus = racines.flatMap((l) => (l.groupe ? l.membres : [l]));
    const aLireNote =
      estInterne && courrier.etape_code === 'diffuse' && individus.some((l) => l.concerne && !l.date);
    return {
      lignes: racines,
      total: individus.length,
      lus: individus.filter((l) => l.date).length,
      aLire: aLireNote,
    };
  }, [destinataires, entites, utilisateurs, contacts, utilisateurId, estInterne, courrier.etape_code, avantDiffusion, courrier.created_by]);

  const [ouverts, setOuverts] = useState<Record<string, boolean>>({});

  if (lignes.length === 0) return null;
  const diffusee = !avantDiffusion;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{estInterne ? 'Destinataires de la note' : 'Ampliataires'}</CardTitle>
        {estInterne && (
          <Badge variant={total > 0 && lus === total ? 'success' : 'muted'}>
            {diffusee ? `${lus}/${total} pris connaissance` : `${total} destinataire${total > 1 ? 's' : ''} prévus`}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {aLire && (
          <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[13px]">Cette note vous est adressée pour information.</span>
            <Button size="sm" onClick={() => priseConnaissance.mutate()} disabled={priseConnaissance.isPending}>
              <Eye />
              J'ai pris connaissance
            </Button>
          </div>
        )}
        <ul className="divide-y divide-border rounded-lg border border-border">
          {lignes.map((l) =>
            l.groupe ? (
              <li key={l.id} className="text-[13px]">
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() => setOuverts((o) => ({ ...o, [l.id]: !o[l.id] }))}
                  aria-expanded={!!ouverts[l.id]}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {ouverts[l.id] ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
                    <Users className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{l.libelle}</span>
                    <span className="ml-1 text-[12px] text-muted-foreground">{l.nature}</span>
                  </span>
                  {estInterne && (
                    <span className="shrink-0 text-[12px] text-muted-foreground">
                      {diffusee
                        ? `${l.membres.filter((m) => m.date).length}/${l.membres.length} lus`
                        : `${l.membres.length} agent${l.membres.length > 1 ? 's' : ''} prévus`}
                    </span>
                  )}
                </button>
                {ouverts[l.id] && l.membres.length > 0 && (
                  <ul className="divide-y divide-border border-t border-border bg-muted/30">
                    {l.membres.map((m) => (
                      <LigneDestinataire key={m.id} ligne={m} estInterne={estInterne} retrait />
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <LigneDestinataire key={l.id} ligne={l} estInterne={estInterne} />
            ),
          )}
        </ul>
      </CardContent>
    </Card>
  );
}

function LigneDestinataire({ ligne, estInterne, retrait }: { ligne: Ligne; estInterne: boolean; retrait?: boolean }) {
  return (
    <li className={`flex items-center justify-between gap-3 py-2 pr-3 text-[13px] ${retrait ? 'pl-9' : 'pl-3'}`}>
      <span className="min-w-0">
        <span className="font-medium">{ligne.libelle}</span>
        {!retrait && <span className="ml-2 text-[12px] text-muted-foreground">{ligne.nature}</span>}
      </span>
      {estInterne &&
        (ligne.date ? (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-good-text">
            <CheckCheck className="size-3.5" /> Lu le {fr(ligne.date).format('D MMM YYYY à HH:mm')}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
            <Clock className="size-3.5" /> En attente
          </span>
        ))}
    </li>
  );
}
