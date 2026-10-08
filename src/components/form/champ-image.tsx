import { ImageIcon, LoaderCircle, Upload } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../ui/button';

// Choix d'une image (logo, sceau…) : aperçu + bouton d'envoi. L'envoi est
// délégué à `onFichier` (upload immédiat, comme antd Upload beforeUpload).
export function ChampImage({
  id,
  url,
  onFichier,
  enCours,
  desactive,
  libelle = 'Choisir une image',
}: {
  id?: string;
  url?: string | null;
  onFichier: (fichier: File) => void;
  enCours?: boolean;
  desactive?: boolean;
  libelle?: string;
}) {
  const champ = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white">
        {url ? (
          <img src={url} alt="Aperçu" className="max-h-14 max-w-14 object-contain" />
        ) : (
          <ImageIcon className="size-5 text-[#8a8f89]" aria-hidden />
        )}
      </div>
      <input
        ref={champ}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          e.target.value = '';
          if (fichier) onFichier(fichier);
        }}
      />
      <Button type="button" variant="outline" disabled={desactive || enCours} onClick={() => champ.current?.click()}>
        {enCours ? <LoaderCircle className="animate-spin" /> : <Upload />}
        {url ? "Remplacer l'image" : libelle}
      </Button>
    </div>
  );
}
