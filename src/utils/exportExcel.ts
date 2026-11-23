// Export Excel des statistiques — v8.8.0 : exceljs remplace xlsx (SheetJS,
// failles connues sans correctif). Chargé à la demande pour ne pas alourdir
// l'application.
export interface FeuilleExport {
  nom: string;
  lignes: Record<string, unknown>[];
}

export async function exporterClasseur(nomFichier: string, feuilles: FeuilleExport[]): Promise<void> {
  const { Workbook } = await import('exceljs');
  const classeur = new Workbook();
  for (const f of feuilles) {
    const feuille = classeur.addWorksheet(f.nom.slice(0, 31));
    const colonnes = Array.from(new Set(f.lignes.flatMap((l) => Object.keys(l))));
    feuille.columns = colonnes.map((c) => ({
      header: c,
      key: c,
      width: Math.min(60, Math.max(c.length, ...f.lignes.map((l) => String(l[c] ?? '').length)) + 2),
    }));
    feuille.getRow(1).font = { bold: true };
    for (const l of f.lignes) feuille.addRow(l);
  }
  const tampon = await classeur.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([tampon], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nomFichier;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
