import { CheckCheck, Clock, Eye } from 'lucide-react';
import { useMemo } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useContacts } from '../../hooks/courrier/useContacts';
import { useDestinataires, usePriseConnaissanceCourrier } from '../../hooks/courrier/useDestinataires';
import type { Courrier } from '../../services/courrier/courriers';
import { fr } from '../../utils/dateFr';

interface Props {
  courrier: Courrier;
  organisationId: string;
  utilisateurId: string | undefined;
}

// Recette 2026-11 : destinataires d'une note interne (diffusion pour information)
// ou ampliataires d'un départ, avec le suivi de la prise de connaissance.
export function CourrierDiffusionCard({ courrier, organisationId, utilisateurId }: Props) {
  const { data: destinataires } = useDestinataires(courrier.id);
  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: contacts } = useContacts(organisationId);
  const priseConnaissance = usePriseConnaissanceCourrier(courrier.id);
  const estInterne = courrier.sens === 'interne';

  const lignes = useMemo(() => {
    const entiteParId = new Map((entites ?? []).map((e) => [e.id, e]));
    const nomUtilisateur = new Map((utilisateurs ?? []).map((u) => [u.id, `${u.prenom} ${u.nom}`]));
    const nomContact = new Map((contacts ?? []).map((c) => [c.id, c.nom]));
    return (destinataires ?? [])
      .filter((d) => estInterne || d.type_diffusion === 'copie')
      .map((d) => {
        const e = d.entite_id ? entiteParId.get(d.entite_id) : undefined;
        const libelle = d.utilisateur_id
          ? (nomUtilisateur.get(d.utilisateur_id) ?? '—')
          : e
            ? `${e.sigle ? `${e.sigle} — ` : ''}${e.libelle}`
            : d.contact_id
              ? (nomContact.get(d.contact_id) ?? '—')
              : '—';
        const concerne =
          !!utilisateurId &&
          (d.utilisateur_id
            ? d.utilisateur_id === utilisateurId
            : !!e && (e.responsable_utilisateur_id === utilisateurId || e.personne_receptrice_id === utilisateurId));
        return { id: d.id, libelle, nature: d.utilisateur_id ? 'Personne' : d.entite_id ? 'Entité' : 'Contact', date: d.date_prise_connaissance, concerne };
      });
  }, [destinataires, entites, utilisateurs, contacts, utilisateurId, estInterne]);

  if (lignes.length === 0) return null;
  const lus = lignes.filter((l) => l.date).length;
  const aLire = estInterne && courrier.etape_code === 'diffuse' && lignes.some((l) => l.concerne && !l.date);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{estInterne ? 'Destinataires de la note' : 'Ampliataires'}</CardTitle>
        {estInterne && (
          <Badge variant={lus === lignes.length ? 'success' : 'muted'}>
            {lus}/{lignes.length} pris connaissance
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
          {lignes.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
              <span className="min-w-0">
                <span className="font-medium">{l.libelle}</span>
                <span className="ml-2 text-[12px] text-muted-foreground">{l.nature}</span>
              </span>
              {estInterne &&
                (l.date ? (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] text-good-text">
                    <CheckCheck className="size-3.5" /> Lu le {fr(l.date).format('D MMM YYYY à HH:mm')}
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-[12px] text-muted-foreground">
                    <Clock className="size-3.5" /> En attente
                  </span>
                ))}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
