import { zodResolver } from '@hookform/resolvers/zod';
import {
  CompassOutlined,
  FileProtectOutlined,
  LockOutlined,
  LoginOutlined,
  MailOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState, type CSSProperties } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { DrapeauTchad } from '../components/branding/DrapeauTchad';
import { env } from '../config/env';
import { useAuth } from '../hooks/useAuth';
import { darken } from '../utils/color';

const loginSchema = z.object({
  email: z.string().min(1, "L'email est requis").email('Adresse email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const trustPoints = [
  { icon: <SafetyCertificateOutlined />, label: 'Traçabilité complète des courriers' },
  { icon: <FileProtectOutlined />, label: 'Archivage numérique sécurisé' },
  { icon: <TeamOutlined />, label: 'Accès maîtrisé par rôle' },
  { icon: <ProjectOutlined />, label: 'Gestion des projets' },
  { icon: <CompassOutlined />, label: 'Gestion des missions' },
];

// Identité institutionnelle de la page de connexion : en dur, volontairement
// indépendante de la base (voir documentation/Design page login.txt, §3/§4)
// — contrairement au reste de l'application (en-tête, documents imprimés),
// qui continue d'utiliser l'organisation configurée en base
// (useOrganisationBranding, App.tsx). Ne pas fusionner ces deux sources.
const NOM_ORGANISATION = 'DIRECTION GENERALE DES DOUANES ET DES DROITS INDIRECTS - DGDDI';
const NOM_PAYS = 'RÉPUBLIQUE DU TCHAD';
const DEVISE_PAYS = 'Unité - Travail - Progrès';
const NOM_SYSTEME = 'SYSTÈME D’INFORMATION MANAGÉRIEL – SIM';

// Bleu institutionnel fixe pour cette page uniquement : volontairement
// découplé de token.colorPrimary (dérivé de organisation_branding en base
// via App.tsx/buildTheme.ts) pour ne dépendre d'aucune donnée de la base.
const BLEU_INSTITUTIONNEL = '#0B3D91';
const brandGradient = `linear-gradient(135deg, ${darken(BLEU_INSTITUTIONNEL, 0.35)} 0%, ${BLEU_INSTITUTIONNEL} 100%)`;

export function LoginPage() {
  const { session, loading, signIn } = useAuth();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  if (!loading && session) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setSubmitting(false);
    if (error) {
      setSubmitError(
        error === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error,
      );
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel" style={{ background: brandGradient }}>
        <div className="login-brand-texture" aria-hidden="true" />

        {/* Drapeau + pays + devise : en haut et centrés dans la bande, à
            part du bloc logo/organisation (centré verticalement, aligné à
            gauche, plus bas). Masqué en mobile comme .login-brand-details
            (voir index.css). */}
        <div className="login-brand-topbar" style={styles.brandTopbar}>
          <div style={styles.paysLigne}>
            <DrapeauTchad />
            <span style={styles.paysNom}>{NOM_PAYS}</span>
          </div>
          <span style={styles.devise}>« {DEVISE_PAYS} »</span>
        </div>

        <div style={styles.brandContent}>
          <div style={styles.brandHeaderRow}>
            <img src="/logo-organisation.jpg" alt={NOM_ORGANISATION} style={styles.logo} />

            {/* Nom de l'organisation masqué en mobile comme le reste de
                .login-brand-details (voir index.css) — seul le logo reste
                visible en dessous de 992px. */}
            <Typography.Title level={5} className="login-brand-orgname" style={styles.orgName}>
              {NOM_ORGANISATION}
            </Typography.Title>
          </div>

          {/* Nom complet du système : masqué en mobile comme le nom de
              l'organisation (voir index.css). */}
          <div className="login-brand-orgname" style={styles.systemNameWrapper}>
            <span style={styles.systemNameRule} aria-hidden="true" />
            <span style={styles.systemName}>{NOM_SYSTEME}</span>
          </div>

          {/* Regroupe tout ce qui doit disparaître en version compacte
              (mobile) : seuls le logo et le dégradé restent visibles en
              dessous de 992px — voir .login-brand-details dans index.css. */}
          <div className="login-brand-details" style={styles.brandDetails}>
            <p style={styles.tagline}>
              Gestion sécurisée du courrier et des documents institutionnels.
            </p>
            <ul style={styles.trustList}>
              {trustPoints.map((point) => (
                <li key={point.label} style={styles.trustItem}>
                  <span style={styles.trustIcon}>{point.icon}</span>
                  {point.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <span style={styles.brandFooter}>© {new Date().getFullYear()} — DGDDI</span>
      </div>

      <div className="login-form-panel">
        <div style={styles.formCard}>
          <Typography.Text style={styles.appName}>{env.appName}</Typography.Text>
          <Typography.Title level={3} style={{ marginBottom: 4, marginTop: 2 }}>
            Connexion
          </Typography.Title>
          <Typography.Text type="secondary">Accédez à votre espace de gestion.</Typography.Text>

          <Form layout="vertical" onFinish={handleSubmit(onSubmit)} style={{ marginTop: 24 }}>
            <Form.Item
              label="Email professionnel"
              validateStatus={errors.email ? 'error' : ''}
              help={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    size="large"
                    prefix={<MailOutlined style={{ color: '#838C86' }} />}
                    placeholder="prenom.nom@organisation.fr"
                    autoComplete="username"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Mot de passe"
              validateStatus={errors.password ? 'error' : ''}
              help={errors.password?.message}
            >
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <Input.Password
                    {...field}
                    size="large"
                    prefix={<LockOutlined style={{ color: '#838C86' }} />}
                    autoComplete="current-password"
                  />
                )}
              />
            </Form.Item>

            {submitError && (
              <Alert type="error" message={submitError} style={{ marginBottom: 16 }} showIcon />
            )}

            <Button type="primary" htmlType="submit" size="large" block loading={submitting} icon={<LoginOutlined />} style={{ background: BLEU_INSTITUTIONNEL }}>
              Se connecter
            </Button>
          </Form>

          <Typography.Text type="secondary" style={styles.helper}>
            Besoin d'aide ? Contactez votre administrateur système.
          </Typography.Text>
        </div>
      </div>
    </div>
  );
}

const styles = {
  brandContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 12,
    maxWidth: 440,
    position: 'relative',
  },
  logo: {
    height: 64,
    width: 64,
    objectFit: 'contain',
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 6,
    flexShrink: 0,
  },
  brandHeaderRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  brandDetails: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    width: '100%',
  },
  orgName: {
    color: '#FFFFFF',
    margin: 0,
    fontSize: 18,
    lineHeight: 1.35,
    letterSpacing: '0.01em',
  },
  systemNameWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
  },
  systemNameRule: {
    width: 36,
    height: 2,
    borderRadius: 1,
    background: '#B8863A',
  },
  systemName: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#D9B872',
  },
  brandTopbar: {
    // top en dur : le containing block d'un élément absolu est la padding
    // box de l'ancêtre positionné, donc top: 0 se cale au bord extérieur
    // du padding (juste sous la bordure), pas sous le padding lui-même —
    // il faut recréer l'inset explicitement (padding du panel : 64px).
    position: 'absolute',
    top: 32,
    left: 0,
    right: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    textAlign: 'center',
  },
  paysLigne: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paysNom: {
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  devise: {
    fontSize: 13,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tagline: {
    fontSize: 15,
    lineHeight: 1.5,
    color: 'rgba(255, 255, 255, 0.85)',
    margin: '8px 0 0',
  },
  trustList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  trustItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  trustIcon: {
    color: '#B8863A',
    fontSize: 16,
    display: 'inline-flex',
  },
  brandFooter: {
    // bottom en dur pour la même raison que brandTopbar.top (containing
    // block = padding box de l'ancêtre positionné, bottom: 0 se cale au
    // bord extérieur du padding, pas sous le padding lui-même).
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
  },
  appName: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#838C86',
  },
  helper: {
    display: 'block',
    marginTop: 20,
    fontSize: 13,
    textAlign: 'center',
  },
} satisfies Record<string, CSSProperties>;
