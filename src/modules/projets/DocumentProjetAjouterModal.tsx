import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Form, Input, Modal, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAjouterDocumentProjet } from '../../hooks/projets/useDocumentsProjet';
import type { ProjetsReferentiel } from '../../services/projets/referentiel';
import type { Livrable } from '../../services/projets/livrables';

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
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { titre: '', description: '', typeValeurId: '', livrableId: livrableIdFixe ?? '' },
  });

  useEffect(() => {
    if (open) {
      reset({ titre: '', description: '', typeValeurId: '', livrableId: livrableIdFixe ?? '' });
      setFichier(null);
      setFichierListe([]);
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
        <Form.Item label="Type de document">
          <Controller
            name="typeValeurId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                options={(referentiel?.typesDocument ?? []).map((v) => ({ value: v.id, label: v.libelle }))}
              />
            )}
          />
        </Form.Item>
        {livrables && livrables.length > 0 && !livrableIdFixe && (
          <Form.Item label="Livrable associé" help="Optionnel — laisser vide pour un document rattaché directement au projet">
            <Controller
              name="livrableId"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  showSearch
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={livrables.map((l) => ({ value: l.id, label: l.nom }))}
                />
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
