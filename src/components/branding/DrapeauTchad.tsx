interface DrapeauTchadProps {
  width?: number;
  height?: number;
}

// Drapeau national (trois bandes verticales égales, proportions 2:3) —
// dessiné en local, aucune dépendance externe ni fichier image à fournir.
export function DrapeauTchad({ width = 28, height = 20 }: DrapeauTchadProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 30 20"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Drapeau de la République du Tchad"
    >
      <rect x="0" y="0" width="10" height="20" fill="#002664" />
      <rect x="10" y="0" width="10" height="20" fill="#FECB00" />
      <rect x="20" y="0" width="10" height="20" fill="#C60C30" />
    </svg>
  );
}
