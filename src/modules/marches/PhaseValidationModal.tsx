import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAjouterDocumentMarcheMutation } from '../../hooks/marches/useDocumentsMarche';
import { usePhaseMarcheMutations } from '../../hooks/marches/usePhasesMarche';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';

const schema = z.object({ titre: z.string().min(1, 'Requis') });
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  phase: PhaseMarcheAvecStatut | null;
  onClose: () => void;
}

// §12 : un document justificatif est obligatoire pour valider la réalisation
// d'une phase — ce modal permet de le joindre puis enchaîne la validation
// (qui enregistre automatiquement la date de fin réelle côté serveur), même
// principe que LivrableClotureModal côté Projets.
export function PhaseValidationModal({ open, marcheId, phase, onClose }: Props) {
  const ajouterDocument = useAjouterDocumentMarcheMutation(marcheId);
  const { valider } = usePhaseMarcheMutations(marcheId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: phase ? `Justificatif — ${phase.nom}` : '' });
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, phase, reset]);

  const enCours = ajouterDocument.isPending || valider.isPending;

  const onSubmit = (values: FormValues) => {
    if (!fichier || !phase) return;
    ajouterDocument.mutate(
      { payload: { titre: values.titre, phase_marche_id: phase.id }, fichier },
      {
        onSuccess: () => {
          valider.mutate(phase.id, { onSuccess: () => onClose() });
        },
      },
    );
  };

  return (
    <Modal
      open={open}
      title="Joindre un justificatif et valider la phase"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={enCours}
      destroyOnHidden
    >
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="Cette phase n'a pas encore de document justificatif — il est requis pour la valider (§12)."
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
