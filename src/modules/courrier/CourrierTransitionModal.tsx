import { useQueryClient } from '@tanstack/react-query';
import { FileText, FileUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Champ } from '../../components/form/champ';
import { FormDialog } from '../../components/form/form-dialog';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/input';
import { useExecuterTransitionCourrier } from '../../hooks/courrier/useWorkflow';
import { message } from '../../lib/notifications';
import type { Courrier } from '../../services/courrier/courriers';
import { uploadPieceJointe } from '../../services/courrier/piecesJointes';
import type { TransitionDisponible } from '../../services/courrier/workflow';

// Fenêtre d'une action de circuit sans imputation (recette 2026-11) : traiter
// et soumettre, valider, demander une correction… L'utilisateur peut laisser
// un compte rendu (obligatoire seulement pour une demande de correction : c'est
// le motif transmis à l'agent) et joindre des fichiers Word ou PDF, rangés
// dans les pièces jointes du courrier et cités dans l'historique du circuit.

const TYPES_ACCEPTES =
  '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function estDemandeCorrection(t: Pick<TransitionDisponible, 'code' | 'libelle_action'>): boolean {
  return /correction/i.test(t.code) || /correction/i.test(t.libelle_action);
}

export function CourrierTransitionModal({
  courrier,
  transition,
  onClose,
}: {
  courrier: Courrier;
  transition: TransitionDisponible | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const executer = useExecuterTransitionCourrier(courrier.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [commentaire, setCommentaire] = useState('');
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const correction = transition ? estDemandeCorrection(transition) : false;
  const commentaireRequis = correction;

  const fermer = () => {
    setCommentaire('');
    setFichiers([]);
    onClose();
  };

  const valider = async () => {
    if (!transition) return;
    if (commentaireRequis && !commentaire.trim()) return;
    setEnvoiEnCours(true);
    try {
      for (const f of fichiers) await uploadPieceJointe(courrier.id, f, false);
      if (fichiers.length > 0) void queryClient.invalidateQueries({ queryKey: ['pieces-jointes', courrier.id] });
      const texte = [
        commentaire.trim(),
        fichiers.length > 0 ? `Fichiers joints : ${fichiers.map((f) => f.name).join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n');
      await executer.mutateAsync({ transitionId: transition.transition_id, commentaire: texte || undefined });
      fermer();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <FormDialog
      open={transition !== null}
      onClose={fermer}
      titre={transition?.libelle_action ?? ''}
      description={`${courrier.numero} — ${courrier.objet}`}
      onSubmit={(e) => {
        e.preventDefault();
        void valider();
      }}
      enCours={envoiEnCours}
      validerDesactive={commentaireRequis && !commentaire.trim()}
      libelleValider={transition?.libelle_action}
      variante={correction ? 'destructive' : 'default'}
      largeur="lg"
    >
      <Champ
        label={correction ? 'Motif de la correction' : 'Compte rendu'}
        htmlFor="transition-commentaire"
        requis={commentaireRequis}
        aide={correction ? "Transmis à l'agent et visible dans l'historique du circuit." : 'Facultatif — visible dans l’historique du circuit.'}
      >
        <Textarea
          id="transition-commentaire"
          rows={4}
          autoFocus
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder={correction ? 'Ce qui doit être corrigé ou complété' : 'Travail réalisé, réponse proposée, points d’attention…'}
        />
      </Champ>

      <Champ label="Fichiers (Word ou PDF)" htmlFor="transition-fichiers" aide="Facultatif — rangés dans les pièces jointes du courrier.">
        <input
          ref={inputRef}
          id="transition-fichiers"
          type="file"
          multiple
          accept={TYPES_ACCEPTES}
          className="sr-only"
          onChange={(e) => {
            const liste = [...(e.target.files ?? [])];
            if (liste.length > 0) setFichiers((actuels) => [...actuels, ...liste]);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          <FileUp />
          Ajouter des fichiers
        </Button>
        {fichiers.length > 0 && (
          <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
            {fichiers.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{f.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-crit-text hover:bg-crit/10"
                  aria-label={`Retirer ${f.name}`}
                  onClick={() => setFichiers((actuels) => actuels.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Champ>
    </FormDialog>
  );
}
