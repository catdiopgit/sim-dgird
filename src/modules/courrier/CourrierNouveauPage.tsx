import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { ArrowLeft, Check, CircleAlert, Info, LoaderCircle, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { Input, Textarea } from '../../components/ui/input';
import { NativeSelect } from '../../components/ui/native-select';
import { Skeleton } from '../../components/ui/skeleton';
import { useEntites, useUtilisateursOptions } from '../../hooks/administration/useEntites';
import { useCourrierReferentiel, useCreerCourrier } from '../../hooks/courrier/useCourriers';
import { useProfile } from '../../hooks/useProfile';
import { cn } from '../../lib/utils';
import type { SensCourrier } from '../../services/courrier/courriers';
import { couleurReferentiel } from '../../utils/couleurReferentiel';
import { DESCRIPTION_SENS, ICONE_SENS, LABEL_SENS } from './courrierAffichage';

// Même schéma que l'ancien CourrierFormModal ; les dates sont saisies via des
// champs natifs (chaînes) puis converties au même format dans le payload.
const schema = z.object({
  sens: z.enum(['entrant', 'sortant', 'interne']),
  entiteId: z.string().min(1, 'Requis'),
  objet: z.string().min(1, 'Requis'),
  typeValeurId: z.string().optional(),
  prioriteValeurId: z.string().optional(),
  confidentialiteValeurId: z.string().optional(),
  modeTransmissionValeurId: z.string().optional(),
  dateCourrier: z.string().optional(),
  dateReception: z.string().optional(),
  dateEnvoi: z.string().optional(),
  expediteurNom: z.string().optional(),
  expediteurTypeValeurId: z.string().optional(),
  destinataireTexte: z.string().optional(),
  entiteDestinataireId: z.string().optional(),
  agentDestinataireId: z.string().optional(),
  observations: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const SENS: SensCourrier[] = ['entrant', 'sortant', 'interne'];

const CORRESPONDANT: Record<SensCourrier, { titre: string; description: string }> = {
  entrant: { titre: 'Expéditeur', description: 'Qui vous écrit et à qui le courrier est destiné en interne.' },
  sortant: { titre: 'Destinataire externe', description: "À qui le courrier est adressé et comment il est transmis." },
  interne: { titre: 'Destinataire interne', description: 'Entité et agent qui reçoivent la note.' },
};

function Champ({ label, htmlFor, requis, erreur, children, className }: {
  label: string;
  htmlFor?: string;
  requis?: boolean;
  erreur?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium">
        {label} {requis && <span className="text-crit-text">*</span>}
      </label>
      {children}
      {erreur && (
        <p id={htmlFor ? `${htmlFor}-erreur` : undefined} className="mt-1.5 flex items-center gap-1 text-[12px] text-crit-text">
          <CircleAlert className="size-3.5" />
          {erreur}
        </p>
      )}
    </div>
  );
}

function Section({ titre, description, children }: { titre: string; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-[15px] font-semibold">{titre}</h2>
      {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CourrierNouveauPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile } = useProfile();
  const organisationId = profile?.organisation_id;

  const sensUrl = searchParams.get('sens');
  const sensInitial: SensCourrier = (SENS as string[]).includes(sensUrl ?? '') ? (sensUrl as SensCourrier) : 'interne';

  const { data: entites } = useEntites(organisationId);
  const { data: utilisateurs } = useUtilisateursOptions(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);
  const creer = useCreerCourrier(organisationId);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      sens: sensInitial,
      entiteId: '',
      objet: '',
      typeValeurId: '',
      prioriteValeurId: '',
      confidentialiteValeurId: '',
      modeTransmissionValeurId: '',
      dateCourrier: dayjs().format('YYYY-MM-DD'),
      dateReception: '',
      dateEnvoi: '',
      expediteurNom: '',
      expediteurTypeValeurId: '',
      destinataireTexte: '',
      entiteDestinataireId: '',
      agentDestinataireId: '',
      observations: '',
    },
  });

  const sens = watch('sens');
  const prioriteId = watch('prioriteValeurId');

  const onSubmit = (values: FormValues) => {
    creer.mutate(
      {
        p_entite_id: values.entiteId,
        p_sens: values.sens,
        p_objet: values.objet,
        p_type_valeur_id: values.typeValeurId || null,
        p_priorite_valeur_id: values.prioriteValeurId || null,
        p_confidentialite_valeur_id: values.confidentialiteValeurId || null,
        p_mode_transmission_valeur_id: values.modeTransmissionValeurId || null,
        p_date_courrier: values.dateCourrier || null,
        p_date_reception: values.dateReception ? dayjs(values.dateReception).toISOString() : null,
        p_date_envoi: values.dateEnvoi ? dayjs(values.dateEnvoi).toISOString() : null,
        p_expediteur_nom: values.expediteurNom || null,
        p_expediteur_type_valeur_id: values.expediteurTypeValeurId || null,
        p_destinataire_texte: values.destinataireTexte || null,
        p_entite_destinataire_id: values.entiteDestinataireId || null,
        p_agent_destinataire_id: values.agentDestinataireId || null,
        p_observations: values.observations || null,
      },
      { onSuccess: (courrier) => navigate(`/courriers/${courrier.id}`) },
    );
  };

  if (!organisationId) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const optionsEntites = (entites ?? []).map((e) => (
    <option key={e.id} value={e.id}>
      {e.sigle ? `${e.sigle} — ${e.libelle}` : e.libelle}
    </option>
  ));
  const optionsAgents = (utilisateurs ?? []).map((u) => (
    <option key={u.id} value={u.id}>
      {u.prenom} {u.nom}
    </option>
  ));
  const priorites = referentiel?.priorites ?? [];

  return (
    <div>
      <Link to="/courriers" className="mb-3 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Retour aux courriers
      </Link>
      <div className="mb-6">
        <h1 className="font-serif-title text-[28px] font-semibold leading-tight">Nouveau courrier</h1>
        <p className="mt-1 text-muted-foreground">
          Les champs marqués <span className="text-crit-text">*</span> sont obligatoires. Le numéro est attribué à l'enregistrement.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Section titre="Sens du courrier" description="Détermine les informations demandées plus bas.">
            <div role="radiogroup" aria-label="Sens du courrier" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {SENS.map((s) => {
                const { icone: Icone, classe } = ICONE_SENS[s];
                return (
                  <label
                    key={s}
                    className="cursor-pointer rounded-lg border border-border p-4 transition-colors hover:bg-muted/60 has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:ring-1 has-[:checked]:ring-primary has-[:focus-visible]:ring-2"
                  >
                    <input type="radio" value={s} className="sr-only" {...register('sens')} />
                    <Icone className={cn('mb-2 size-5', classe)} />
                    <span className="block font-semibold">{LABEL_SENS[s]}</span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">{DESCRIPTION_SENS[s]}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          <Section titre="Identification">
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              <Champ label="Objet" htmlFor="objet" requis erreur={errors.objet?.message} className="md:col-span-2">
                <Input
                  id="objet"
                  autoFocus
                  placeholder="Ex. Note de service sur la rotation des agents"
                  aria-invalid={Boolean(errors.objet)}
                  aria-describedby={errors.objet ? 'objet-erreur' : undefined}
                  {...register('objet')}
                />
              </Champ>
              <Champ label="Entité en charge" htmlFor="entiteId" requis erreur={errors.entiteId?.message}>
                <NativeSelect
                  id="entiteId"
                  aria-invalid={Boolean(errors.entiteId)}
                  aria-describedby={errors.entiteId ? 'entiteId-erreur' : undefined}
                  {...register('entiteId')}
                >
                  <option value="">Sélectionner une entité</option>
                  {optionsEntites}
                </NativeSelect>
              </Champ>
              <Champ label="Date du courrier" htmlFor="dateCourrier">
                <Input id="dateCourrier" type="date" {...register('dateCourrier')} />
              </Champ>
              <Champ label="Type de courrier" htmlFor="typeValeurId">
                <NativeSelect id="typeValeurId" {...register('typeValeurId')}>
                  <option value="">—</option>
                  {(referentiel?.types ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.libelle}
                    </option>
                  ))}
                </NativeSelect>
              </Champ>
              <Champ label="Confidentialité" htmlFor="confidentialiteValeurId">
                <NativeSelect id="confidentialiteValeurId" {...register('confidentialiteValeurId')}>
                  <option value="">—</option>
                  {(referentiel?.confidentialites ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.libelle}
                    </option>
                  ))}
                </NativeSelect>
              </Champ>
              {priorites.length > 0 && (
                <div className="md:col-span-2">
                  <span className="mb-1.5 block text-[13px] font-medium">Priorité</span>
                  <div role="radiogroup" aria-label="Priorité" className="flex flex-wrap gap-2">
                    {[{ id: '', libelle: 'Non définie', couleur: null }, ...priorites].map((p) => {
                      const actif = (prioriteId ?? '') === p.id;
                      return (
                        <button
                          key={p.id || 'aucune'}
                          type="button"
                          role="radio"
                          aria-checked={actif}
                          onClick={() => setValue('prioriteValeurId', p.id)}
                          className={cn(
                            'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors',
                            actif ? 'border-primary bg-accent font-semibold text-accent-foreground' : 'border-border hover:bg-muted',
                          )}
                        >
                          {p.id && (
                            <span className="size-2 rounded-full" style={{ background: couleurReferentiel(p.couleur) ?? 'var(--st-neutral)' }} />
                          )}
                          {p.libelle}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section titre={CORRESPONDANT[sens].titre} description={CORRESPONDANT[sens].description}>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              {sens === 'entrant' && (
                <>
                  <Champ label="Expéditeur" htmlFor="expediteurNom">
                    <Input id="expediteurNom" placeholder="Nom de l'expéditeur" {...register('expediteurNom')} />
                  </Champ>
                  <Champ label="Type d'expéditeur" htmlFor="expediteurTypeValeurId">
                    <NativeSelect id="expediteurTypeValeurId" {...register('expediteurTypeValeurId')}>
                      <option value="">—</option>
                      {(referentiel?.typesExpediteur ?? []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.libelle}
                        </option>
                      ))}
                    </NativeSelect>
                  </Champ>
                  <Champ label="Date de réception" htmlFor="dateReception">
                    <Input id="dateReception" type="datetime-local" {...register('dateReception')} />
                  </Champ>
                  <Champ label="Agent destinataire" htmlFor="agentDestinataireId">
                    <NativeSelect id="agentDestinataireId" {...register('agentDestinataireId')}>
                      <option value="">—</option>
                      {optionsAgents}
                    </NativeSelect>
                  </Champ>
                </>
              )}
              {sens === 'sortant' && (
                <>
                  <Champ label="Destinataire" htmlFor="destinataireTexte">
                    <Input id="destinataireTexte" placeholder="Nom du destinataire" {...register('destinataireTexte')} />
                  </Champ>
                  <Champ label="Mode de transmission" htmlFor="modeTransmissionValeurId">
                    <NativeSelect id="modeTransmissionValeurId" {...register('modeTransmissionValeurId')}>
                      <option value="">—</option>
                      {(referentiel?.modesTransmission ?? []).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.libelle}
                        </option>
                      ))}
                    </NativeSelect>
                  </Champ>
                  <Champ label="Date d'envoi" htmlFor="dateEnvoi">
                    <Input id="dateEnvoi" type="datetime-local" {...register('dateEnvoi')} />
                  </Champ>
                </>
              )}
              {sens === 'interne' && (
                <>
                  <Champ label="Entité destinataire" htmlFor="entiteDestinataireId">
                    <NativeSelect id="entiteDestinataireId" {...register('entiteDestinataireId')}>
                      <option value="">—</option>
                      {optionsEntites}
                    </NativeSelect>
                  </Champ>
                  <Champ label="Agent destinataire" htmlFor="agentDestinataireId">
                    <NativeSelect id="agentDestinataireId" {...register('agentDestinataireId')}>
                      <option value="">—</option>
                      {optionsAgents}
                    </NativeSelect>
                  </Champ>
                </>
              )}
            </div>
          </Section>

          <Section titre="Observations" description="Facultatif · visible dans la fiche du courrier.">
            <Textarea id="observations" rows={3} placeholder="Instructions, contexte…" aria-label="Observations" {...register('observations')} />
          </Section>

          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-end gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
            {Object.keys(errors).length > 0 && (
              <span className="mr-auto hidden items-center gap-1.5 text-[13px] text-crit-text sm:inline-flex">
                <CircleAlert className="size-4" />
                Renseignez les champs obligatoires.
              </span>
            )}
            <Button variant="outline" size="lg" type="button" onClick={() => navigate('/courriers')}>
              Annuler
            </Button>
            <Button size="lg" type="submit" disabled={creer.isPending}>
              {creer.isPending ? <LoaderCircle className="animate-spin" /> : <Check />}
              {creer.isPending ? 'Enregistrement…' : 'Enregistrer le courrier'}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-[14px] font-semibold">Récapitulatif</h3>
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sens</dt>
                <dd className="font-medium">{LABEL_SENS[sens]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Numéro</dt>
                <dd className="text-right text-muted-foreground">attribué à l'enregistrement</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Enregistré par</dt>
                <dd className="text-right font-medium">
                  {profile ? `${profile.prenom} ${profile.nom}` : '—'}
                </dd>
              </div>
            </dl>
            <p className="mt-4 border-t border-border pt-4 text-[12px] text-muted-foreground">
              Le courrier suit ensuite le circuit défini dans Administration › Workflows.
            </p>
          </div>

          {sens !== 'interne' && (
            <div className="rounded-xl border border-dashed border-border p-4 text-[13px]">
              <div className="flex gap-2.5">
                <Wand2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">
                    {sens === 'entrant' ? 'Assistant « Courrier arrivé »' : 'Assistant « Courrier départ »'}
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    Recommandé : pièces jointes, destinataires multiples et contrôles propres à ce type de courrier.
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    className="mt-1 h-auto px-0"
                    onClick={() => navigate(`/courriers?assistant=${sens === 'entrant' ? 'arrive' : 'depart'}`)}
                  >
                    Ouvrir l'assistant
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2.5 rounded-xl bg-muted/70 p-4 text-[12px] text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" />
            <p>Les pièces jointes s'ajoutent depuis la fiche du courrier, une fois celui-ci enregistré.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
