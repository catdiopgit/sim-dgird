import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ, ChampFichier } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { useAjouterDocumentProjet } from '../../hooks/projets/useDocumentsProjet';
import { ariaErreur } from '../../lib/form';
import type { Livrable } from '../../services/projets/livrables';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';

const schema = z.object({
  titre: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  typeValeurId: z.string().optional(),
  livrableId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  referentiel: ProjetsReferentiel | undefined;
  livrables?: Livrable[];
  livrableIdFixe?: string;
  onClose: () => void;
}

export function DocumentProjetAjouterModal({ open, projetId, referentiel, livrables, livrableIdFixe, onClose }: Props) {
  const ajouter = useAjouterDocumentProjet(projetId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [tentative, setTentative] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', typeValeurId: '', livrableId: livrableIdFixe ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: '', description: '', typeValeurId: '', livrableId: livrableIdFixe ?? '' });
      setFichier(null);
      setTentative(false);
    }
  }, [open, livrableIdFixe, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    ajouter.mutate(
      {
        payload: {
          p_projet_id: projetId,
          p_titre: values.titre,
          p_description: values.description || null,
          p_type_projet_valeur_id: values.typeValeurId || null,
          p_livrable_id: values.livrableId || null,
        },
        fichier,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Ajouter un document"
      onSubmit={(e) => {
        setTentative(true);
        void handleSubmit(onSubmit)(e);
      }}
      enCours={ajouter.isPending}
      libelleValider="Ajouter le document"
    >
      <Champ label="Fichier" htmlFor="doc-projet-fichier" requis erreur={tentative && !fichier ? 'Un fichier est requis' : undefined}>
        <ChampFichier id="doc-projet-fichier" fichier={fichier} onChange={setFichier} invalide={tentative && !fichier} />
      </Champ>
      <Champ label="Titre" htmlFor="doc-projet-titre" requis erreur={errors.titre?.message}>
        <Input {...ariaErreur('doc-projet-titre', errors.titre)} {...register('titre')} />
      </Champ>
      <Champ label="Description" htmlFor="doc-projet-description">
        <Textarea id="doc-projet-description" rows={2} {...register('description')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Type de document" htmlFor="doc-projet-type">
          <NativeSelect id="doc-projet-type" {...register('typeValeurId')}>
            <option value="">—</option>
            {(referentiel?.typesDocument ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.libelle}
              </option>
            ))}
          </NativeSelect>
        </Champ>
        {livrables && livrables.length > 0 && !livrableIdFixe && (
          <Champ label="Livrable associé" htmlFor="doc-projet-livrable" aide="Laisser vide pour un document du projet">
            <NativeSelect id="doc-projet-livrable" {...register('livrableId')}>
              <option value="">Aucun</option>
              {livrables.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom}
                </option>
              ))}
            </NativeSelect>
          </Champ>
        )}
      </div>
    </FormDialog>
  );
}
