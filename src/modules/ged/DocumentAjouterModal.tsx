import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ScanLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Button } from '../../components/ui/button';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useAjouterDocumentVersement } from '../../hooks/ged/useDocuments';
import { useConfidentialitesGed } from '../../hooks/ged/useGedReferentiel';
import { ariaErreur } from '../../lib/form';
import { message } from '../../lib/notifications';
import type { Document } from '../../services/ged/documents';
import { etatAgentScan, numeriser, type EtatAgentScan } from '../../services/scanner/agentScan';

const schema = z.object({
  titre: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  organisationId: string;
  versementId: string;
  onClose: () => void;
  onAjoute: (document: Document) => void;
  // v8.6.11 : ouvert depuis « Numériser » : la numérisation démarre aussitôt.
  scanAuDemarrage?: boolean;
}

const VIDE: FormValues = { titre: '', description: '', confidentialiteValeurId: '' };

// Ajoute un document au versement en brouillon (GED V2) : le classement
// (dossier du plan de classement, mots-clés, renommage) reste une action
// ultérieure et facultative pour l'agent — c'est l'archiviste qui classe
// document par document au panneau de Classement, pas au moment du dépôt.
export function DocumentAjouterModal({ open, organisationId, versementId, onClose, onAjoute, scanAuDemarrage = false }: Props) {
  const { data: confidentialites } = useConfidentialitesGed(organisationId);
  const ajouter = useAjouterDocumentVersement(versementId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [tentative, setTentative] = useState(false);
  const [agent, setAgent] = useState<EtatAgentScan | null>(null);
  const [scanEnCours, setScanEnCours] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    if (open) {
      reset(VIDE);
      setFichier(null);
      setTentative(false);
    }
  }, [open, reset]);

  // Même agent de numérisation que pour les courriers (outils/agent-scan).
  useEffect(() => {
    if (!open) return;
    let actif = true;
    setAgent(null);
    void etatAgentScan().then((etat) => {
      if (!actif) return;
      setAgent(etat);
      if (scanAuDemarrage && etat.disponible) void scanner();
    });
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, scanAuDemarrage]);

  const scanner = async () => {
    setScanEnCours(true);
    try {
      choisirFichier(await numeriser('versement'));
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setScanEnCours(false);
    }
  };

  const titreScan = !agent
    ? "Recherche de l'agent de numérisation…"
    : agent.disponible
      ? `Numériser avec ${agent.scanner ?? 'le scanner du poste'}`
      : 'Agent de numérisation non détecté sur ce poste';

  const choisirFichier = (f: File | null) => {
    setFichier(f);
    // Titre proposé à partir du nom du fichier s'il n'a pas encore été saisi.
    if (f && !getValues('titre')) setValue('titre', f.name.replace(/\.[^.]+$/, ''), { shouldValidate: tentative });
  };

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    ajouter.mutate(
      {
        payload: {
          p_versement_id: versementId,
          p_titre: values.titre,
          p_description: values.description || null,
          p_confidentialite_valeur_id: values.confidentialiteValeurId || null,
        },
        fichier,
      },
      { onSuccess: (document) => onAjoute(document) },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre={scanAuDemarrage ? "Numériser un document" : "Ajouter un document"}
      description="Le fichier importé ou numérisé devient la première version du document."
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={ajouter.isPending}
      libelleValider="Ajouter le document"
    >
      <Champ label="Fichier" htmlFor="document-fichier" requis erreur={tentative && !fichier ? 'Un fichier est requis' : undefined}>
        <div className="space-y-2">
          <ChampFichier id="document-fichier" fichier={fichier} onChange={choisirFichier} invalide={tentative && !fichier} />
          <Button type="button" variant="outline" size="sm" disabled={!agent?.disponible || scanEnCours} title={titreScan} onClick={() => void scanner()}>
            {scanEnCours ? <Loader2 className="animate-spin" /> : <ScanLine />}
            {scanEnCours ? 'Numérisation en cours…' : 'Numériser'}
          </Button>
          {agent && !agent.disponible && (
            <p className="text-[12px] text-muted-foreground">Agent de numérisation non détecté sur ce poste : importez un fichier, ou installez l'agent (outils/agent-scan).</p>
          )}
        </div>
      </Champ>
      <Champ label="Titre" htmlFor="document-titre" requis erreur={errors.titre?.message}>
        <Input {...ariaErreur('document-titre', errors.titre)} {...register('titre')} />
      </Champ>
      <Champ label="Description" htmlFor="document-description">
        <Textarea id="document-description" rows={2} {...register('description')} />
      </Champ>
      <Champ label="Confidentialité" htmlFor="document-confidentialite">
        <NativeSelect id="document-confidentialite" {...register('confidentialiteValeurId')}>
          <option value="">—</option>
          {(confidentialites ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.libelle}
            </option>
          ))}
        </NativeSelect>
      </Champ>
    </FormDialog>
  );
}
