import { UploadOutlined } from '@ant-design/icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DatePicker, Form, Input, InputNumber, Modal, Select, Upload } from 'antd';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useDecaissementMutations } from '../../hooks/projets/useDecaissements';
import type { Avenant } from '../../services/projets/avenants';

const schema = z.object({
  origine: z.string(),
  pourcentage: z.number().min(0.01, 'Requis').max(100),
  montant: z.number().min(0.01, 'Requis'),
  dateDecaissement: z.custom<dayjs.Dayjs>(),
  observations: z.string().optional(),
  titreJustificatif: z.string().min(1, 'Requis'),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  budgetPrevu: number | null;
  avenants: Avenant[] | undefined;
  onClose: () => void;
}

const ORIGINE_CONTRAT = 'contrat';

const VIDE: FormValues = {
  origine: ORIGINE_CONTRAT,
  pourcentage: 0,
  montant: 0,
  dateDecaissement: dayjs(),
  observations: '',
  titreJustificatif: '',
};

// §2/§4 Gestion des décaissements : origine (contrat d'origine ou un
// avenant précis, pour un suivi séparé des cumuls — app.fn_verifier_decaissement,
// 0075) et calcul automatique montant <-> pourcentage à partir du montant de
// cette origine (budget_prevu du projet, ou montant de l'avenant choisi).
export function DecaissementFormModal({ open, projetId, budgetPrevu, avenants, onClose }: Props) {
  const { create } = useDecaissementMutations(projetId);
  const [fichier, setFichier] = useState<File | null>(null);
  const [fichierListe, setFichierListe] = useState<UploadFile[]>([]);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  const origine = watch('origine');

  const montantBase = useMemo(() => {
    if (origine === ORIGINE_CONTRAT) return budgetPrevu;
    const avenant = (avenants ?? []).find((a) => a.id === origine);
    return avenant?.montant ?? null;
  }, [origine, budgetPrevu, avenants]);

  const optionsOrigine = useMemo(
    () => [
      { value: ORIGINE_CONTRAT, label: "Contrat d'origine" },
      ...(avenants ?? []).map((a) => ({ value: a.id, label: `${a.reference} — ${a.objet}` })),
    ],
    [avenants],
  );

  useEffect(() => {
    if (open) {
      reset(VIDE);
      setFichier(null);
      setFichierListe([]);
    }
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    if (!fichier) return;
    create.mutate(
      {
        insert: {
          projet_id: projetId,
          avenant_id: values.origine === ORIGINE_CONTRAT ? null : values.origine,
          pourcentage: values.pourcentage,
          montant: values.montant,
          date_decaissement: values.dateDecaissement.format('YYYY-MM-DD'),
          observations: values.observations || null,
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
      title="Ajouter un décaissement"
      onCancel={onClose}
      onOk={handleSubmit(onSubmit)}
      confirmLoading={create.isPending}
      destroyOnHidden
    >
      <Form layout="vertical">
        <Form.Item label="Origine" help="Contrat d'origine ou avenant concerné — sert de base au calcul montant / pourcentage">
          <Controller name="origine" control={control} render={({ field }) => <Select {...field} options={optionsOrigine} />} />
        </Form.Item>
        {montantBase == null && (
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="Aucun montant de référence pour cette origine : montant et pourcentage restent indépendants."
          />
        )}
        <Form.Item label="Pourcentage (%)">
          <Controller
            name="pourcentage"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={0}
                max={100}
                style={{ width: '100%' }}
                onChange={(v) => {
                  const pct = v ?? 0;
                  field.onChange(pct);
                  if (montantBase != null) setValue('montant', Math.round((pct / 100) * montantBase * 100) / 100);
                }}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Montant">
          <Controller
            name="montant"
            control={control}
            render={({ field }) => (
              <InputNumber
                {...field}
                min={0}
                style={{ width: '100%' }}
                onChange={(v) => {
                  const montant = v ?? 0;
                  field.onChange(montant);
                  if (montantBase) setValue('pourcentage', Math.round((montant / montantBase) * 100 * 100) / 100);
                }}
              />
            )}
          />
        </Form.Item>
        <Form.Item label="Date du décaissement">
          <Controller
            name="dateDecaissement"
            control={control}
            render={({ field }) => <DatePicker {...field} style={{ width: '100%' }} />}
          />
        </Form.Item>
        <Form.Item label="Observations">
          <Controller
            name="observations"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
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
