import { Typography } from 'antd';
import type { EnteteDocument } from '../../hooks/administration/useEnteteDocument';
import type { Organisation } from '../../services/administration/organisations';

interface Props {
  organisation: Pick<Organisation, 'nom' | 'logo_url'> | undefined;
  entete: EnteteDocument;
  titre: string;
}

// En-tête partagé par tous les documents imprimés (fiche d'exploitation
// arrivée, statistiques…) : logo gauche (Administration > Organisation),
// lignes configurables + nom de l'organisation au centre, logo/sceau droit
// (Administration > Paramétrage > En-tête document).
export function EnteteDocumentImprime({ organisation, entete, titre }: Props) {
  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
        <tbody>
          <tr>
            <td style={{ width: '20%', textAlign: 'left', verticalAlign: 'middle' }}>
              {organisation?.logo_url && (
                <img src={organisation.logo_url} alt="" style={{ height: 56, objectFit: 'contain' }} />
              )}
            </td>
            <td style={{ width: '60%', textAlign: 'center', verticalAlign: 'middle' }}>
              {entete.lignesEnTete.map((ligne, i) => (
                <div key={i} style={{ fontSize: 13 }}>
                  {ligne}
                </div>
              ))}
            </td>
            <td style={{ width: '20%', textAlign: 'right', verticalAlign: 'middle' }}>
              {entete.logoDroitUrl && (
                <img src={entete.logoDroitUrl} alt="" style={{ height: 56, objectFit: 'contain' }} />
              )}
            </td>
          </tr>
        </tbody>
      </table>

      <Typography.Title level={5} style={{ textAlign: 'center', margin: '0 0 4px' }}>
        {organisation?.nom ?? ''}
      </Typography.Title>
      <Typography.Title level={4} style={{ textAlign: 'center', margin: '0 0 12px' }}>
        {titre}
      </Typography.Title>
    </>
  );
}
