import QRCode from 'qrcode';

// QR de la fiche d'exploitation (plan V4 §14) : encode uniquement un lien
// vers la fiche du courrier dans l'application — aucune donnée métier dans
// le QR lui-même. L'accès reste soumis à la connexion et aux permissions RLS
// existantes (rien de nouveau côté sécurité). Génération 100% client, sans
// appel réseau.
export async function genererQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { margin: 1, width: 160 });
}
