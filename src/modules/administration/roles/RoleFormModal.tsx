import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../../components/form/champ';
import { FormDialog } from '../../../components/form/form-dialog';
import { Input, Textarea } from '../../../components/ui/input';
import { ariaErreur } from '../../../lib/form';
import type { Role } from '../../../services/administration/roles';
import { slugifier } from '../../../utils/slug';

const schema = z.object({
  code: z.string().min(1, 'Requis'),
  libelle: z.string().min(1, 'Requis'),
  description: z.string().optional(),
});
export type RoleFormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  role?: Role | null;
  confirmLoading: boolean;
  onCancel: () => void;
  onSubmit: (values: RoleFormValues) => void;
}

export function RoleFormModal({ open, role, confirmLoading, onCancel, onSubmit }: Props) {
  const estNouveau = !role;
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', libelle: '', description: '' },
  });

  useEffect(() => {
    if (open) {
      reset({ code: role?.code ?? '', libelle: role?.libelle ?? '', description: role?.description ?? '' });
    }
  }, [open, role, reset]);

  // Code proposé automatiquement à partir du libellé pour un nouveau rôle.
  const libelle = watch('libelle');
  useEffect(() => {
    if (estNouveau && libelle) setValue('code', slugifier(libelle));
  }, [libelle, estNouveau, setValue]);

  return (
    <FormDialog
      open={open}
      onClose={onCancel}
      titre={estNouveau ? 'Nouveau rôle' : 'Modifier le rôle'}
      description="Les permissions du rôle se règlent ensuite dans la matrice."
      onSubmit={handleSubmit(onSubmit)}
      enCours={confirmLoading}
      libelleValider={estNouveau ? 'Créer le rôle' : 'Enregistrer'}
    >
      <Champ label="Libellé" htmlFor="role-libelle" requis erreur={errors.libelle?.message}>
        <Input autoFocus {...ariaErreur('role-libelle', errors.libelle)} {...register('libelle')} />
      </Champ>
      <Champ label="Code" htmlFor="role-code" requis aide={estNouveau ? 'Proposé à partir du libellé.' : undefined} erreur={errors.code?.message}>
        <Input className="font-mono" {...ariaErreur('role-code', errors.code)} {...register('code')} />
      </Champ>
      <Champ label="Description" htmlFor="role-description">
        <Textarea id="role-description" rows={2} {...register('description')} />
      </Champ>
    </FormDialog>
  );
}
