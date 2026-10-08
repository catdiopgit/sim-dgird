import { LoaderCircle, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { useCreerContact } from '../../../hooks/courrier/useContacts';

// Création rapide d'un contact (organisme) depuis un assistant, directement
// dans le formulaire plutôt que dans une fenêtre imbriquée.
export function ContactRapide({
  organisationId,
  onCree,
  libelle = 'Nouveau contact',
}: {
  organisationId: string;
  onCree: (contact: { id: string; nom: string }) => void;
  libelle?: string;
}) {
  const creerContact = useCreerContact(organisationId);
  const [ouvert, setOuvert] = useState(false);
  const [nom, setNom] = useState('');

  const creer = async () => {
    if (!nom.trim()) return;
    const contact = await creerContact.mutateAsync({ nom: nom.trim(), type: 'administration' });
    onCree(contact);
    setNom('');
    setOuvert(false);
  };

  if (!ouvert) {
    return (
      <Button type="button" variant="outline" className="shrink-0" onClick={() => setOuvert(true)}>
        <Plus />
        {libelle}
      </Button>
    );
  }

  return (
    <div className="flex w-full items-center gap-2 rounded-lg border border-border bg-muted/40 p-2">
      <Input
        autoFocus
        className="h-9 bg-card"
        placeholder="Nom du contact / de l'organisme"
        aria-label="Nom du nouveau contact"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void creer();
          }
        }}
      />
      <Button type="button" size="sm" className="h-9" disabled={!nom.trim() || creerContact.isPending} onClick={() => void creer()}>
        {creerContact.isPending ? <LoaderCircle className="animate-spin" /> : 'Créer'}
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Annuler la création" onClick={() => setOuvert(false)}>
        <X />
      </Button>
    </div>
  );
}
