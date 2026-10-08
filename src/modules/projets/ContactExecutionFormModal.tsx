import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Input } from '../../components/ui/input';
import { useContactExecutionMutations } from '../../hooks/projets/useContactsExecution';
import { ariaErreur } from '../../lib/form';

const schema = z.object({
  nom: z.string().min(1, 'Requis'),
  fonction: z.string().optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  projetId: string;
  onClose: () => void;
}

const VIDE: FormValues = { nom: '', fonction: '', email: '', telephone: '' };

// §4 Contact de l'organisme chargé d'exécuter le projet (consultant,
// entreprise...) sans compte SIM — sert ensuite de responsable possible pour
// un livrable, ou de "chargé de l'exécution" du projet.
export function ContactExecutionFormModal({ open, projetId, onClose }: Props) {
  const { create } = useContactExecutionMutations(projetId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: VIDE,
  });

  useEffect(() => {
    if (open) reset(VIDE);
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    create.mutate(
      {
        projet_id: projetId,
        nom: values.nom,
        fonction: values.fonction || null,
        email: values.email || null,
        telephone: values.telephone || null,
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      titre="Ajouter un contact d'exécution"
      description="Personne de l'organisme d'exécution, sans compte SIM."
      onSubmit={handleSubmit(onSubmit)}
      enCours={create.isPending}
      libelleValider="Ajouter le contact"
    >
      <Champ label="Nom" htmlFor="contact-nom" requis erreur={errors.nom?.message}>
        <Input autoFocus {...ariaErreur('contact-nom', errors.nom)} {...register('nom')} />
      </Champ>
      <Champ label="Fonction" htmlFor="contact-fonction">
        <Input id="contact-fonction" {...register('fonction')} />
      </Champ>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Champ label="Email" htmlFor="contact-email">
          <Input id="contact-email" type="email" {...register('email')} />
        </Champ>
        <Champ label="Téléphone" htmlFor="contact-telephone">
          <Input id="contact-telephone" type="tel" {...register('telephone')} />
        </Champ>
      </div>
    </FormDialog>
  );
}
