import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAjouterDocumentMarcheMutation } from '../../hooks/marches/useDocumentsMarche';
import type { PhaseMarcheAvecStatut } from '../../services/marches/phasesMarche';
import type { MarcheCandidat } from '../../services/marches/candidats';

const schema = z.object({
  titre: z.string().min(1, 'Requis'),
  description: z.string().optional(),
  phaseMarcheId: z.string().optional(),
  marcheCandidatId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  marcheId: string;
  phases?: PhaseMarcheAvecStatut[];
  candidats?: MarcheCandidat[];
  phaseIdFixe?: string;
  candidatIdFixe?: string;
  onClose: () => void;
}

// §9 Documents du marché — un seul appel multipart, comme pour Projets.
export function DocumentMarcheAjouterModal({
  open,
  marcheId,
  phases,
  candidats,
  phaseIdFixe,
  candidatIdFixe,
  onClose,
}: Props) {
  const ajouter = useAjouterDocumentMarcheMutation(marcheId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', phaseMarcheId: phaseIdFixe ?? '', marcheCandidatId: candidatIdFixe ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: '', description: '', phaseMarcheId: phaseIdFixe ?? '', marcheCandidatId: candidatIdFixe ?? '' });
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, phaseIdFixe, candidatIdFixe, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    ajouter.mutate(
      {
        payload: {
          titre: values.titre,
          description: values.description || null,
          phase_marche_id: values.phaseMarcheId || null,
          marche_candidat_id: values.marcheCandidatId || null,
        },
        fichier,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      open={open}
      title="Ajouter un document"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={ajouter.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Titre">
          <Controller name="titre" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Description">
          <Controller name="description" control={control} render={({ field }) => <Input.TextArea {...field} rows={2} />} />
        </Form.Item>
        {phases && phases.length > 0 && !phaseIdFixe && !candidatIdFixe && (
          <Form.Item label="Phase associée" help="Optionnel — laisser vide pour un document rattaché directement au marché">
            <Controller
              name="phaseMarcheId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={phases.map((p) => ({ value: p.id, label: p.nom }))} />
              )}
            />
          </Form.Item>
        )}
        {candidats && candidats.length > 0 && !phaseIdFixe && !candidatIdFixe && (
          <Form.Item label="Candidat associé" help="Optionnel — pour joindre une offre technique/financière">
            <Controller
              name="marcheCandidatId"
              control={control}
              render={({ field }) => (
                <Select {...field} allowClear options={candidats.map((c) => ({ value: c.id, label: c.nom }))} />
              )}
            />
          </Form.Item>
        )}
        <Form.Item label="Fichier" required>
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
