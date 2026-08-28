import { BarChartOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Dropdown, Input, Segmented, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEntites } from '../../hooks/administration/useEntites';
import { useBannetteCourriers, useCourrierReferentiel, useCourriers } from '../../hooks/courrier/useCourriers';
import { useProfile } from '../../hooks/useProfile';
import type { Bannette, Courrier, SensCourrier } from '../../services/courrier/courriers';
import { CourrierFormModal } from './CourrierFormModal';
import { CourrierArriveWizard } from './wizard/CourrierArriveWizard';
import { CourrierDepartWizard } from './wizard/CourrierDepartWizard';

const BANNETTES_VALIDES: Bannette[] = ['a_traiter', 'en_retard', 'sortants', 'en_copie', 'clotures', 'archives'];

const LABEL_SENS: Record<SensCourrier, string> = {
  entrant: 'Entrant',
  sortant: 'Sortant',
  interne: 'Interne',
};
const COULEUR_SENS: Record<SensCourrier, string> = {
  entrant: 'blue',
  sortant: 'green',
  interne: 'purple',
};

export function CourrierListePage() {
  const navigate = useNavigate();
  const { profile, can } = useProfile();
  const organisationId = profile?.organisation_id;

  // Permet un lien direct vers une bannette (ex. depuis les tuiles de la page
  // Statistiques, /courriers?vue=en_retard) sans dupliquer la logique de filtrage.
  const [searchParams] = useSearchParams();
  const vueDepuisUrl = searchParams.get('vue');
  const vueInitiale: 'tous' | Bannette =
    vueDepuisUrl && (BANNETTES_VALIDES as string[]).includes(vueDepuisUrl) ? (vueDepuisUrl as Bannette) : 'tous';

  const [vue, setVue] = useState<'tous' | Bannette>(vueInitiale);
  const [sensFiltre, setSensFiltre] = useState<'tous' | SensCourrier>('tous');
  const [recherche, setRecherche] = useState('');
  const [modalSens, setModalSens] = useState<'interne' | null>(null);
  const [wizardArriveOuvert, setWizardArriveOuvert] = useState(false);
  const [wizardDepartOuvert, setWizardDepartOuvert] = useState(false);

  const { data: courriersTous, isLoading: chargementTous } = useCourriers(organisationId, {
    sens: sensFiltre === 'tous' ? undefined : sensFiltre,
    recherche: recherche || undefined,
  });
  const { data: courriersBannette, isLoading: chargementBannette } = useBannetteCourriers(
    vue === 'tous' ? undefined : vue,
  );
  const courriers = vue === 'tous' ? courriersTous : courriersBannette;
  const isLoading = vue === 'tous' ? chargementTous : chargementBannette;
  const { data: entites } = useEntites(organisationId);
  const { data: referentiel } = useCourrierReferentiel(organisationId);

  const entiteParId = useMemo(() => new Map((entites ?? []).map((e) => [e.id, e.libelle])), [entites]);
  const prioriteParId = useMemo(
    () => new Map((referentiel?.priorites ?? []).map((v) => [v.id, v])),
    [referentiel],
  );
  const typeParId = useMemo(() => new Map((referentiel?.types ?? []).map((v) => [v.id, v])), [referentiel]);

  const peutCreer = can('courrier', 'creer');

  if (!organisationId) return <Skeleton active />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Courriers
        </Typography.Title>
        <Space>
          <Button icon={<BarChartOutlined />} onClick={() => navigate('/courriers/statistiques')}>
            Statistiques
          </Button>
          {peutCreer && (
          <Dropdown
            menu={{
              items: [
                { key: 'entrant', label: 'Courrier arrivé' },
                { key: 'sortant', label: 'Courrier départ' },
                { key: 'interne', label: 'Courrier interne' },
              ],
              onClick: ({ key }) => {
                if (key === 'entrant') setWizardArriveOuvert(true);
                else if (key === 'sortant') setWizardDepartOuvert(true);
                else setModalSens('interne');
              },
            }}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              Nouveau courrier <DownOutlined />
            </Button>
          </Dropdown>
          )}
        </Space>
      </div>

      <Space style={{ marginBottom: 12 }} wrap>
        <Segmented
          value={vue}
          onChange={(v) => setVue(v as 'tous' | Bannette)}
          options={[
            { value: 'tous', label: 'Tous les courriers' },
            { value: 'a_traiter', label: 'À traiter' },
            { value: 'en_retard', label: 'En retard' },
            { value: 'sortants', label: 'Courriers de départ' },
            { value: 'en_copie', label: 'En copie' },
            { value: 'clotures', label: 'Clôturés' },
            { value: 'archives', label: 'Archivés' },
          ]}
        />
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <Segmented
          value={sensFiltre}
          disabled={vue !== 'tous'}
          onChange={(v) => setSensFiltre(v as 'tous' | SensCourrier)}
          options={[{ value: 'interne', label: 'Internes' }]}
        />
        <Input.Search
          placeholder="Rechercher un objet…"
          allowClear
          disabled={vue !== 'tous'}
          style={{ width: 280 }}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </Space>

      <Table<Courrier>
        rowKey="id"
        loading={isLoading}
        dataSource={courriers}
        onRow={(record) => ({
          onClick: () => navigate(`/courriers/${record.id}`),
          style: { cursor: 'pointer' },
        })}
        columns={[
          { title: 'Numéro', dataIndex: 'numero', width: 160 },
          {
            title: 'Sens',
            dataIndex: 'sens',
            width: 100,
            render: (sens: SensCourrier) => <Tag color={COULEUR_SENS[sens]}>{LABEL_SENS[sens]}</Tag>,
          },
          { title: 'Objet', dataIndex: 'objet' },
          {
            title: 'Entité',
            render: (_, c) => (c.entite_id ? (entiteParId.get(c.entite_id) ?? '—') : <Tag>Non imputé</Tag>),
          },
          {
            title: 'Type',
            render: (_, c) => {
              const t = c.type_valeur_id ? typeParId.get(c.type_valeur_id) : null;
              return t ? <Tag color={t.couleur ?? undefined}>{t.libelle}</Tag> : '—';
            },
          },
          {
            title: 'Priorité',
            render: (_, c) => {
              const p = c.priorite_valeur_id ? prioriteParId.get(c.priorite_valeur_id) : null;
              return p ? <Tag color={p.couleur ?? undefined}>{p.libelle}</Tag> : '—';
            },
          },
          { title: 'Étape', dataIndex: 'etape_libelle', render: (v: string | null) => v ?? '—' },
          {
            title: 'Date',
            dataIndex: 'date_courrier',
            width: 110,
            render: (v: string) => new Date(v).toLocaleDateString('fr-FR'),
          },
        ]}
      />

      <CourrierFormModal
        open={modalSens !== null}
        organisationId={organisationId}
        sensInitial={modalSens ?? 'interne'}
        onClose={() => setModalSens(null)}
        onCree={(courrier) => {
          setModalSens(null);
          navigate(`/courriers/${courrier.id}`);
        }}
      />

      <CourrierArriveWizard
        open={wizardArriveOuvert}
        organisationId={organisationId}
        onClose={() => setWizardArriveOuvert(false)}
        onTermine={(courrier) => {
          setWizardArriveOuvert(false);
          navigate(`/courriers/${courrier.id}`);
        }}
      />

      <CourrierDepartWizard
        open={wizardDepartOuvert}
        organisationId={organisationId}
        onClose={() => setWizardDepartOuvert(false)}
        onTermine={(courrier) => {
          setWizardDepartOuvert(false);
          navigate(`/courriers/${courrier.id}`);
        }}
      />
    </div>
  );
}
