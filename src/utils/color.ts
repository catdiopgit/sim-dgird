const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHex(value: string | null | undefined): value is string {
  return typeof value === 'string' && HEX_RE.test(value);
}

/** Assombrit une couleur hex (#RRGGBB) d'un facteur entre 0 (inchangé) et 1 (noir). */
export function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const factor = 1 - amount;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(clamp((n >> 16) & 0xff))}${toHex(clamp((n >> 8) & 0xff))}${toHex(clamp(n & 0xff))}`;
}
