import { forwardRef } from 'react';
import { useOrganisationBranding } from '../../../hooks/administration/useOrganisationBranding';

export interface AgentFiche {
  prenom: string;
  nom: string;
  entite?: string | null;
  fonction?: string | null;
}

// v8.6.9 — fiche d'accès individuelle, imprimée par l'administrateur après une
// création de compte ou une réinitialisation, et remise en main propre.
export const FicheAcces = forwardRef<
  HTMLDivElement,
  { agent: AgentFiche; email: string; motDePasse: string }
>(function FicheAcces({ agent, email, motDePasse }, ref) {
  const { data: branding } = useOrganisationBranding();
  const adresse = `${window.location.origin}/`;
  const ligne = 'border-b border-dotted border-neutral-300 py-[1.6mm] align-top';
  return (
    <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', color: '#111', fontSize: '10.5pt' }}>
      <div style={{ border: '1px solid #888', padding: '7mm 9mm' }}>
        <div className="flex items-start justify-between gap-4" style={{ borderBottom: '2px solid #1F4E3D', paddingBottom: '3mm', marginBottom: '3mm' }}>
          <div className="flex items-center gap-3">
            {branding?.logo_url && <img src={branding.logo_url} alt="" style={{ height: '13mm', width: 'auto' }} />}
            <div>
              <div style={{ fontSize: '9pt', color: '#444' }}>{branding?.nom ?? ''}</div>
              <div style={{ fontSize: '13pt', fontWeight: 700, color: '#1F4E3D', marginTop: '1mm' }}>Vos accès au SIM</div>
            </div>
          </div>
          <div style={{ fontSize: '8pt', fontWeight: 700, color: '#9C0006', border: '1px solid #9C0006', padding: '1mm 2mm' }}>CONFIDENTIEL</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {[
              ['Agent', `${agent.prenom} ${agent.nom}`],
              ['Entité', agent.entite ?? '—'],
              ['Fonction', agent.fonction ?? '—'],
              ['Adresse du SIM', adresse, true],
              ['Identifiant', email, true],
            ].map(([libelle, valeur, mono]) => (
              <tr key={String(libelle)}>
                <th className={ligne} style={{ textAlign: 'left', width: '46mm', fontWeight: 400, color: '#444' }}>{libelle}</th>
                <td className={ligne} style={mono ? { fontFamily: 'Consolas, monospace', fontSize: '11pt' } : undefined}>{valeur}</td>
              </tr>
            ))}
            <tr>
              <th className={ligne} style={{ textAlign: 'left', fontWeight: 400, color: '#444' }}>Mot de passe temporaire</th>
              <td className={ligne} style={{ fontFamily: 'Consolas, monospace', fontSize: '14pt', fontWeight: 700, letterSpacing: '1px' }}>{motDePasse}</td>
            </tr>
          </tbody>
        </table>
        <p style={{ fontSize: '9pt', lineHeight: 1.4, margin: '4mm 0' }}>
          À la première connexion, le SIM vous demandera de choisir votre propre mot de passe : <b>au moins 10 caractères, avec au
          moins une lettre et un chiffre</b>, différent de votre adresse e-mail. Ne communiquez jamais votre mot de passe, y compris à
          l'administrateur. Après 10 erreurs, le compte est bloqué 15 minutes.
        </p>
        <div className="flex justify-between" style={{ fontSize: '9pt', paddingTop: '8mm' }}>
          <span>Remis le : ____ / ____ / ________</span>
          <span>Signature de l'agent :</span>
        </div>
      </div>
    </div>
  );
});
