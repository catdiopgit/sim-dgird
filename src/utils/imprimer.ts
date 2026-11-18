// Impression d'une zone de l'écran dans un cadre (iframe) dédié, au format A4.
//
// v8.6.4 : l'impression directe de la page (window.print + règles @media
// print) imprimait aussi la fenêtre modale et la mise en page de
// l'application : page blanche en tête, contenu décalé et coupé à gauche.
// Ici, seule la zone est recopiée dans un document vierge qui reprend les
// feuilles de style de l'application, puis imprimée seule.
export function imprimerZone(element: HTMLElement | null, titre = 'Impression'): void {
  if (!element) return;
  document.getElementById('cadre-impression-sim')?.remove();

  const cadre = document.createElement('iframe');
  cadre.id = 'cadre-impression-sim';
  cadre.setAttribute('aria-hidden', 'true');
  cadre.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(cadre);

  const doc = cadre.contentDocument;
  const fenetre = cadre.contentWindow;
  if (!doc || !fenetre) return;

  const styles = [...document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style')]
    .map((n) => n.outerHTML)
    .join('\n');

  doc.open();
  doc.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre.replace(/</g, '&lt;')}</title>
${styles}
<style>
  @page { size: A4 portrait; margin: 12mm; }
  html, body { background: #fff !important; color: #161a18; margin: 0; padding: 0; }
  body * { visibility: visible !important; }
  .zone-imprimable { position: static !important; width: 100% !important; max-width: 100% !important; box-sizing: border-box; }
  .zone-imprimable * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .zone-imprimable table { max-width: 100%; }
  .zone-imprimable td, .zone-imprimable th { overflow-wrap: anywhere; word-break: break-word; }
  .zone-imprimable tr, .zone-imprimable img, .bloc-insecable { break-inside: avoid; page-break-inside: avoid; }
</style></head><body>${element.outerHTML}</body></html>`);
  doc.close();

  let lance = false;
  const lancer = () => {
    if (lance) return;
    lance = true;
    fenetre.focus();
    fenetre.print();
    // Le cadre reste le temps de l'impression ; il est retiré à la suivante
    // ou après un délai.
    window.setTimeout(() => cadre.remove(), 60_000);
  };

  // Attendre les images (logo, QR code) avant d'imprimer.
  const images = [...doc.images].filter((img) => !img.complete);
  if (images.length === 0) {
    window.setTimeout(lancer, 150);
  } else {
    let restantes = images.length;
    const fin = () => {
      restantes -= 1;
      if (restantes <= 0) window.setTimeout(lancer, 100);
    };
    images.forEach((img) => {
      img.addEventListener('load', fin, { once: true });
      img.addEventListener('error', fin, { once: true });
    });
    window.setTimeout(lancer, 3000);
  }
}
