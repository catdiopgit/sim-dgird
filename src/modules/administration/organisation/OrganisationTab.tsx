import { zodResolver } from '@hookform/resolvers/zod';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Card, ColorPicker, Divider, Form, Image, Input, Skeleton, Space, Typography, Upload } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useProfile } from '../../../hooks/useProfile';
import {
  useOrganisation,
  useUpdateOrganisation,
  useUploadOrganisationImage,
} from '../../../hooks/administration/useOrganisation';
import { DEFAULT_BRAND_COLOR } from '../../../theme/buildTheme';
import { EntitesTree } from './EntitesTree';
import { FonctionsManager } from './FonctionsManager';
import { TypeEntitesManager } from './TypeEntitesManager';

const schema = z.object({
  code: z.string().min(1, 'Le code est requis'),
  nom: z.string().min(1, 'Le nom est requis'),
  description: z.string().optional(),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  couleur_primaire: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide'),
});

type FormValues = z.infer<typeof schema>;

export function OrganisationTab() {
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;
  const { data: organisation, isLoading } = useOrganisation(organisationId);
  const updateMutation = useUpdateOrganisation(organisationId);
  const uploadImage = useUploadOrganisationImage(organisationId);
  const peutModifier = can('administration', 'modifier');

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', nom: '', description: '', logo_url: '', couleur_primaire: DEFAULT_BRAND_COLOR },
  });
  const logoUrl = watch('logo_url');

  useEffect(() => {
    if (organisation) {
      reset({
        code: organisation.code,
        nom: organisation.nom,
        description: organisation.description ?? '',
        logo_url: organisation.logo_url ?? '',
        couleur_primaire: organisation.couleur_primaire ?? DEFAULT_BRAND_COLOR,
      });
    }
  }, [organisation, reset]);

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      code: values.code,
      nom: values.nom,
      description: values.description || null,
      logo_url: values.logo_url || null,
      couleur_primaire: values.couleur_primaire,
    });
  };

  if (isLoading || !organisationId) {
    return <Skeleton active />;
  }

  return (
    <div>
      <Card>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          Informations générales
        </Typography.Title>
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
          <Form.Item label="Code" validateStatus={errors.code ? 'error' : ''} help={errors.code?.message}>
            <Controller
              name="code"
              control={control}
              render={({ field }) => <Input {...field} disabled={!peutModifier} style={{ maxWidth: 320 }} />}
            />
          </Form.Item>
          <Form.Item label="Nom" validateStatus={errors.nom ? 'error' : ''} help={errors.nom?.message}>
            <Controller
              name="nom"
              control={control}
              render={({ field }) => <Input {...field} disabled={!peutModifier} style={{ maxWidth: 480 }} />}
            />
          </Form.Item>
          <Form.Item label="Description">
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} disabled={!peutModifier} rows={3} style={{ maxWidth: 640 }} />
              )}
            />
          </Form.Item>
          <Form.Item label="Logo">
            <Space align="start">
              <Upload
                accept="image/*"
                showUploadList={false}
                disabled={!peutModifier || uploadImage.isPending}
                beforeUpload={(file) => {
                  uploadImage.mutate(file, {
                    onSuccess: (url) => setValue('logo_url', url, { shouldDirty: true }),
                  });
                  return false;
                }}
              >
                <Button icon={<UploadOutlined />} loading={uploadImage.isPending} disabled={!peutModifier}>
                  Choisir une image
                </Button>
              </Upload>
              {logoUrl && <Image src={logoUrl} alt="" height={48} style={{ objectFit: 'contain' }} />}
            </Space>
          </Form.Item>
          <Form.Item
            label="Couleur principale"
            help={
              errors.couleur_primaire?.message ??
              "Couleur institutionnelle appliquée à l'ensemble de l'application, y compris la page de connexion."
            }
            validateStatus={errors.couleur_primaire ? 'error' : ''}
          >
            <Controller
              name="couleur_primaire"
              control={control}
              render={({ field }) => (
                <ColorPicker
                  value={field.value}
                  disabled={!peutModifier}
                  disabledAlpha
                  showText
                  onChange={(color) => field.onChange(color.toHexString())}
                />
              )}
            />
          </Form.Item>
          {peutModifier && (
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending} disabled={!isDirty}>
              Enregistrer
            </Button>
          )}
        </Form>
      </Card>

      <Divider />
      <TypeEntitesManager organisationId={organisationId} peutModifier={peutModifier} />

      <Divider />
      <EntitesTree organisationId={organisationId} peutModifier={peutModifier} />

      <Divider />
      <FonctionsManager organisationId={organisationId} peutModifier={peutModifier} />
    </div>
  );
}
