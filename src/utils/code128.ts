// Code-barres Code 128 (jeu B) rendu en SVG, sans dépendance — v8.7.2 :
// numéro du courrier en haut à droite de la fiche d'exploitation.
const MOTIFS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

/** Largeurs des barres alternées (noir, blanc, noir…) en modules. */
export function code128B(texte: string): number[] {
  const codes = [START_B];
  for (const car of texte) {
    const c = car.charCodeAt(0);
    codes.push(c >= 32 && c <= 127 ? c - 32 : 0);
  }
  let somme = START_B;
  for (let i = 1; i < codes.length; i++) somme += codes[i] * i;
  codes.push(somme % 103, STOP);
  return codes.flatMap((c) => MOTIFS[c].split('').map(Number));
}

/** Image SVG (data URL) du code-barres, avec zones de silence. */
export function code128SvgDataUrl(texte: string, hauteur = 40): string {
  const barres = code128B(texte);
  const silence = 10;
  let x = silence;
  let rects = '';
  barres.forEach((largeur, i) => {
    if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${largeur}" height="${hauteur}"/>`;
    x += largeur;
  });
  const total = x + silence;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${hauteur}" width="${total}" height="${hauteur}" shape-rendering="crispEdges"><rect width="${total}" height="${hauteur}" fill="#fff"/><g fill="#000">${rects}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
