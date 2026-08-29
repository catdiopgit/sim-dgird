interface DrapeauSenegalProps {
  width?: number;
  height?: number;
}

// Drapeau national (trois bandes verticales égales, proportions 2:3, étoile
// verte à cinq branches centrée sur la bande jaune) — dessiné en local,
// aucune dépendance externe ni fichier image à fournir.
export function DrapeauSenegal({ width = 28, height = 20 }: DrapeauSenegalProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Drapeau de la République du Sénégal"
    >
      <rect x="0" y="0" width="10" height="20" fill="#00853F" />
      <rect x="10" y="0" width="10" height="20" fill="#FDEF42" />
      <rect x="20" y="0" width="10" height="20" fill="#E31B23" />
      <polygon
        points="15,6.5 16.18,10.15 20,10.15 16.91,12.35 18.09,16 15,13.8 11.91,16 13.09,12.35 10,10.15 13.82,10.15"
        fill="#00853F"
      />
    </svg>
  );
}
