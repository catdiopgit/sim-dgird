import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDepenseMutations } from '../../hooks/missions/useDepenses';

const schema = z.object({
  libelle: z.string().min(1, 'Requis'),
  montant: z.number().min(0.01, 'Requis'),
  dateDepense: z.custom<dayjs.Dayjs>(),
  titreJustificatif: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  missionId: string;
  onClose: () => void;
}

const VIDE: FormValues = { libelle: '', montant: 0, dateDepense: dayjs(), titreJustificatif: '' };

export function MissionDepenseFormModal({ open, missionId, onClose }: Props) {
  const { creer } = useDepenseMutations(missionId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    if (open) {
      reset(VIDE);
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    creer.mutate(
      {
        insert: {
          mission_id: missionId,
          libelle: values.libelle,
          montant: values.montant,
          date_depense: values.dateDepense.format('YYYY-MM-DD'),
        },
        fichier,
        titreDocument: values.titreJustificatif,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      open={open}
      title="Ajouter une dépense"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={creer.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Libellé">
          <Controller name="libelle" control={control} render={({ field }) => <Input {...field} autoFocus />} />
        </Form.Item>
        <Form.Item label="Montant">
          <Controller
            name="montant"
            control={control}
            render={({ field }) => <InputNumber {...field} min={0} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Date de la dépense">
          <Controller
            name="dateDepense"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Titre du justificatif">
          <Controller name="titreJustificatif" control={control} render={({ field }) => <Input {...field} />} />
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
          {!fichier && <Alert style={{ marginTop: 8 }} type="info" showIcon message="Un justificatif est requis" />}
        </Form.Item>
      </Form>
    </Modal>
  );
}
