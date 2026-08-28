import { zodResolver } from '@hookform/resolvers/zod';
import { DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Image, Input, Skeleton, Space, Typography, Upload } from 'antd';
import { useEffect } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { CLE_ENTETE_DOCUMENT, useEnteteDocument, type EnteteDocument } from '../../../hooks/administration/useEnteteDocument';
import { useUploadOrganisationImage } from '../../../hooks/administration/useOrganisation';
import {
  useParametreOrganisationMutations,
  useParametresOrganisation,
} from '../../../hooks/administration/useParametrage';
import type { Json } from '../../../types/database';

interface Props {
  organisationId: string;
  peutModifier: boolean;
}

const schema = z.object({
  lignes: z.array(z.object({ valeur: z.string() })),
  logoDroitUrl: z.string().url('URL invalide').optional().or(z.literal('')),
  piedDePage: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function versFormValues(entete: EnteteDocument): FormValues {
  return {
    lignes: entete.lignesEnTete.map((valeur) => ({ valeur })),
    logoDroitUrl: entete.logoDroitUrl ?? '',
    piedDePage: entete.piedDePage ?? '',
  };
}

// En-tête des documents imprimés (fiche d'exploitation, etc.) : lignes de
// texte affichées au-dessus du nom de l'organisation (ex. "REPUBLIQUE DU
// TCHAD" / "Unité - Travail - Progrès") et logo/sceau affiché à droite —
// organisation.logo_url (Administration > Organisation) reste le logo de
// gauche, inchangé. Générique, pas de contenu figé propre à une organisation.
export function EnteteDocumentManager({ organisationId, peutModifier }: Props) {
  const { isLoading } = useParametresOrganisation(organisationId);
  const { upsert } = useParametreOrganisationMutations(organisationId);
  const uploadImage = useUploadOrganisationImage(organisationId);
  const entete = useEnteteDocument(organisationId);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: versFormValues({ lignesEnTete: [], logoDroitUrl: null, piedDePage: null }),
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lignes' });
  const logoDroitUrl = watch('logoDroitUrl');

  useEffect(() => {
    reset(versFormValues(entete));
  }, [entete, reset]);

  const onSubmit = (values: FormValues) => {
    const nouvelleValeur: EnteteDocument = {
      lignesEnTete: values.lignes.map((l) => l.valeur.trim()).filter((v) => v.length > 0),
      logoDroitUrl: values.logoDroitUrl || null,
      piedDePage: values.piedDePage?.trim() || null,
    };
    upsert.mutate({
      cle: CLE_ENTETE_DOCUMENT,
      valeur: nouvelleValeur as unknown as Json,
      description: "En-tête des documents imprimés (lignes au-dessus du nom, logo droit, pied de page).",
    });
  };

  if (isLoading) return <Skeleton active />;

  return (
    <Card>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        En-tête des documents
      </Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, maxWidth: 640 }}
        message="Utilisé par la fiche d'exploitation des courriers arrivés"
        description="Le logo de gauche reste celui configuré dans Administration > Organisation. Les lignes ci-dessous s'affichent au-dessus du nom de l'organisation (ex. mention institutionnelle), et le logo droit s'affiche en vis-à-vis (ex. sceau/armoiries)."
      />
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item label="Lignes d'en-tête (au-dessus du nom de l'organisation)">
          <Space direction="vertical" style={{ width: '100%', maxWidth: 480 }}>
            {fields.map((field, index) => (
              <Space.Compact block key={field.id}>
                <Controller
                  name={`lignes.${index}.valeur`}
                  control={control}
                  render={({ field }) => <Input {...field} disabled={!peutModifier} />}
                />
                {peutModifier && (
                  <Button icon={<DeleteOutlined />} onClick={() => remove(index)} danger />
                )}
              </Space.Compact>
            ))}
            {peutModifier && (
              <Button icon={<PlusOutlined />} onClick={() => append({ valeur: '' })}>
                Ajouter une ligne
              </Button>
            )}
          </Space>
        </Form.Item>

        <Form.Item label="Logo droit (sceau / armoiries)">
          <Space align="start">
            <Upload
              accept="image/*"
              showUploadList={false}
              disabled={!peutModifier || uploadImage.isPending}
              beforeUpload={(file) => {
                uploadImage.mutate(file, {
                  onSuccess: (url) => setValue('logoDroitUrl', url, { shouldDirty: true }),
                });
                return false;
              }}
            >
              <Button icon={<UploadOutlined />} loading={uploadImage.isPending} disabled={!peutModifier}>
                Choisir une image
              </Button>
            </Upload>
            {logoDroitUrl && <Image src={logoDroitUrl} alt="" height={48} style={{ objectFit: 'contain' }} />}
          </Space>
        </Form.Item>

        <Form.Item label="Pied de page">
          <Controller
            name="piedDePage"
            control={control}
            render={({ field }) => (
              <Input {...field} disabled={!peutModifier} placeholder="Laisser vide pour utiliser le code de l'organisation" style={{ maxWidth: 480 }} />
            )}
          />
        </Form.Item>

        {peutModifier && (
          <Button type="primary" htmlType="submit" loading={upsert.isPending} disabled={!isDirty}>
            Enregistrer
          </Button>
        )}
      </Form>
    </Card>
  );
}
