import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAjouterDocumentProjet } from '../../hooks/projets/useDocumentsProjet';
import { useCloturerLivrable } from '../../hooks/projets/useLivrables';
import type { Livrable } from '../../services/projets/livrables';

const schema = z.object({ titre: z.string().min(1, 'Requis') });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  livrable: Livrable | null;
  onClose: () => void;
}

// §1 (V3 bis) : un livrable sans justificatif ne peut pas être clôturé
// directement (fn_cloturer_livrable l'exige, 0066/0073) — plutôt que de
// simplement afficher l'erreur, ce modal permet de joindre le justificatif
// puis enchaîne la clôture dans la foulée : useAjouterDocumentProjet dépose
// le document (rattaché au livrable via p_livrable_id), et son onSuccess
// déclenche useCloturerLivrable — les deux hooks invalident déjà le cache
// nécessaire (livrables, documents-projet, projet, cloture-checklist).
export function LivrableClotureModal({ open, projetId, livrable, onClose }: Props) {
  const ajouterDocument = useAjouterDocumentProjet(projetId);
  const cloturer = useCloturerLivrable(projetId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: livrable ? `Justificatif — ${livrable.nom}` : '' });
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, livrable, reset]);

  const enCours = ajouterDocument.isPending || cloturer.isPending;

  const onSubmit = (values: FormValues) => {
    if (!fichier || !livrable) return;
    ajouterDocument.mutate(
      { payload: { p_projet_id: projetId, p_titre: values.titre, p_livrable_id: livrable.id }, fichier },
      {
        onSuccess: () => {
          cloturer.mutate({ id: livrable.id }, { onSuccess: () => onClose() });
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title="Joindre un justificatif et clôturer le livrable"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
    >
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="Ce livrable n'a pas encore de document justificatif — il est requis pour le clôturer."
      />
      <Form layout="vertical">
        <Form.Item label="Titre du justificatif">
          <Controller name="titre" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Justificatif" required>
          <Upload
            fileList={fichierListe}
            beforeUpload={(f) => {
              setFichier(f);
              setFichierListe([{ uid: f.uid, name: f.name, status: 'done' }]);
              return false;
            }}
            onRemove={() => {
              setFichier(null);
              setFichierListe([]);
            }}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Choisir un fichier</Button>
          </Upload>
          {!fichier && <Alert style={{ marginTop: 8 }} type="info" showIcon message="Un fichier est requis" />}
        </Form.Item>
      </Form>
    </Modal>
  );
}
