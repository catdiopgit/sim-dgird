import dayjs from 'dayjs';
import { env } from '../../config/env';

// Client de l'agent de numérisation local (outils/agent-scan/sim-scan-agent.ps1).
// L'agent pilote le scanner du poste via NAPS2 (pilotes TWAIN/WIA) : changer de
// modèle de scanner ne demande aucune modification de ce code, seulement le
// choix du périphérique dans la configuration de l'agent.

export interface EtatAgentScan {
  disponible: boolean;
  scanner?: string;
}

export async function etatAgentScan(): Promise<EtatAgentScan> {
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), 1500);
  try {
    const reponse = await fetch(`${env.agentScanUrl}/status`, { signal: controle.signal });
    if (!reponse.ok) return { disponible: false };
    const corps = (await reponse.json()) as { scanner?: string };
    return { disponible: true, scanner: corps.scanner };
  } catch {
    return { disponible: false };
  } finally {
    clearTimeout(minuterie);
  }
}

// Lance une numérisation (toutes les pages du chargeur, ou la vitre) et
// renvoie un PDF prêt à être joint. prefixe sert au nom du fichier.
export async function numeriser(prefixe: string): Promise<File> {
  let reponse: Response;
  try {
    reponse = await fetch(`${env.agentScanUrl}/scan`, { method: 'POST' });
  } catch {
    throw new Error(
      "Agent de numérisation injoignable : vérifiez qu'il est installé et démarré sur ce poste (outils/agent-scan).",
    );
  }
  if (!reponse.ok) {
    const message = await reponse.text().catch(() => '');
    throw new Error(message || `Échec de la numérisation (code ${reponse.status}).`);
  }
  const contenu = await reponse.blob();
  if (contenu.size === 0) throw new Error('Le scanner n’a renvoyé aucune page.');
  return new File([contenu], `${prefixe}-${dayjs().format('YYYYMMDD-HHmmss')}.pdf`, { type: 'application/pdf' });
}
