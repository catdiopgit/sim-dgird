import { useId } from 'react';

interface SimMonogramProps {
  size?: number;
  variant?: 'light' | 'dark';
}

/**
 * Emblème institutionnel provisoire (badge + ruban) en attendant le logo
 * officiel de l'organisation. Le dégradé suit la couleur de l'organisation
 * (token --primary, éclairci en mode sombre), le ruban reste doré (accent
 * institutionnel fixe).
 */
export function SimMonogram({ size = 40, variant = 'light' }: SimMonogramProps) {
  const gradientId = useId();
  // Assombrissement équivalent à darken(couleur, 0.35), calculé par le
  // navigateur puisque la couleur vient d'une variable CSS.
  const brandDark = 'color-mix(in srgb, var(--primary) 65%, black)';

  const badgeFill = variant === 'light' ? `url(#${gradientId})` : 'rgba(255, 255, 255, 0.08)';
  const badgeStroke = variant === 'light' ? 'none' : 'rgba(184, 134, 58, 0.55)';
  const ribbonStroke = variant === 'light' ? '#B8863A' : '#E9CFA0';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SIM"
    >
      <defs>
        <linearGradient id={gradientId} x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: brandDark }} />
          <stop offset="1" style={{ stopColor: 'var(--primary)' }} />
        </linearGradient>
      </defs>
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="10"
        fill={badgeFill}
        stroke={badgeStroke}
        strokeWidth={variant === 'dark' ? 1 : 0}
      />
      <path
        d="M13 13c0-5 15-5 15 0s-15 5-15 10 15 5 15 10"
        fill="none"
        stroke={ribbonStroke}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
