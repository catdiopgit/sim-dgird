import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAjouterDocumentVersement } from '../../hooks/ged/useDocuments';
import { useConfidentialitesGed } from '../../hooks/ged/useGedReferentiel';
import type { Document } from '../../services/ged/documents';

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
}

// Ajoute un document au versement en brouillon (GED V2) : le classement
// (dossier du plan de classement, mots-clés, renommage) reste une action
// ultérieure et facultative pour l'agent — c'est l'archiviste qui classe
// document par document au panneau de Classement, pas au moment du dépôt.
export function DocumentAjouterModal({ open, organisationId, versementId, onClose, onAjoute }: Props) {
  const { data: confidentialites } = useConfidentialitesGed(organisationId);
  const ajouter = useAjouterDocumentVersement(versementId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', confidentialiteValeurId: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: '', description: '', confidentialiteValeurId: '' });
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, reset]);

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
          <Controller
            name="description"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>

        <Form.Item label="Confidentialité">
          <Controller
            name="confidentialiteValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(confidentialites ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>

        <Form.Item label="Fichier (première version)" required>
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
