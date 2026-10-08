import { useMemo, useRef, useState } from 'react';
import {
  useWorkflowEtapeMutations,
  useWorkflowEtapes,
  useWorkflowTransitions,
} from '../../../hooks/administration/useWorkflowsAdmin';
import { EnTeteSection } from '../../../components/ui/page-header';
import { cn } from '../../../lib/utils';
import { couleurReferentiel } from '../../../utils/couleurReferentiel';

interface Props {
  workflowDefinitionId: string;
  peutModifier: boolean;
}

const LARGEUR_NOEUD = 168;
const HAUTEUR_NOEUD = 56;
// Écart par défaut (étapes jamais déplacées) : laisse la place au libellé de la transition.
const ESPACEMENT_X = 260;

// Bordure par type d'étape quand aucune couleur n'est définie (tokens de statut).
const COULEUR_PAR_TYPE: Record<string, string> = {
  initiale: 'var(--st-info)',
  intermediaire: 'var(--st-neutral)',
  finale: 'var(--st-good)',
  rejet: 'var(--st-crit)',
};

const LIBELLE_TYPE: Record<string, string> = {
  initiale: 'Initiale',
  intermediaire: 'Intermédiaire',
  finale: 'Finale',
  rejet: 'Rejet',
};

export function WorkflowDiagram({ workflowDefinitionId, peutModifier }: Props) {
  const { data: etapes } = useWorkflowEtapes(workflowDefinitionId);
  const { data: transitions } = useWorkflowTransitions(workflowDefinitionId);
  const { update } = useWorkflowEtapeMutations(workflowDefinitionId);

  const conteneurRef = useRef<HTMLDivElement>(null);
  // Positions en cours de glissement, superposées aux positions stockées le
  // temps du drag (évite un aller-retour serveur à chaque pixel déplacé).
  const [positionsLocales, setPositionsLocales] = useState<Record<string, { x: number; y: number }>>({});
  const dragEnCours = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const positionParDefaut = useMemo(() => {
    const parId = new Map<string, { x: number; y: number }>();
    (etapes ?? [])
      .slice()
      .sort((a, b) => a.ordre - b.ordre)
      .forEach((e, index) => parId.set(e.id, { x: 20 + index * ESPACEMENT_X, y: 20 }));
    return parId;
  }, [etapes]);

  const positionDe = (etapeId: string) => {
    if (positionsLocales[etapeId]) return positionsLocales[etapeId];
    const etape = (etapes ?? []).find((e) => e.id === etapeId);
    if (etape?.position_x != null && etape?.position_y != null) {
      return { x: etape.position_x, y: etape.position_y };
    }
    return positionParDefaut.get(etapeId) ?? { x: 20, y: 20 };
  };

  const onPointerDownNoeud = (e: React.PointerEvent, etapeId: string) => {
    if (!peutModifier) return;
    const conteneur = conteneurRef.current;
    if (!conteneur) return;
    const rectConteneur = conteneur.getBoundingClientRect();
    const pos = positionDe(etapeId);
    dragEnCours.current = {
      id: etapeId,
      offsetX: e.clientX - rectConteneur.left - pos.x,
      offsetY: e.clientY - rectConteneur.top - pos.y,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragEnCours.current;
    const conteneur = conteneurRef.current;
    if (!drag || !conteneur) return;
    const rectConteneur = conteneur.getBoundingClientRect();
    const x = Math.max(0, Math.round(e.clientX - rectConteneur.left - drag.offsetX));
    const y = Math.max(0, Math.round(e.clientY - rectConteneur.top - drag.offsetY));
    setPositionsLocales((prev) => ({ ...prev, [drag.id]: { x, y } }));
  };

  const onPointerUp = () => {
    const drag = dragEnCours.current;
    dragEnCours.current = null;
    if (!drag) return;
    const pos = positionsLocales[drag.id];
    if (pos) {
      update.mutate({ id: drag.id, patch: { position_x: pos.x, position_y: pos.y } });
    }
  };

  const transitionsAvecSource = (transitions ?? []).filter((t) => t.etape_source_id);
  const transitionsSansSource = (transitions ?? []).filter((t) => !t.etape_source_id);

  const largeur = Math.max(
    800,
    ...(etapes ?? []).map((e) => positionDe(e.id).x + LARGEUR_NOEUD + 40),
  );
  const hauteur = Math.max(
    260,
    ...(etapes ?? []).map((e) => positionDe(e.id).y + HAUTEUR_NOEUD + 40),
  );

  if (!etapes || etapes.length === 0) return null;

  return (
    <div>
      <EnTeteSection
        titre="Vue graphique"
        description={peutModifier ? 'Glissez une étape pour la repositionner (enregistré automatiquement).' : undefined}
      />
      <div
        ref={conteneurRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="relative w-full overflow-auto rounded-lg border border-border bg-muted/50"
        style={{ height: hauteur }}
      >
        <svg width={largeur} height={hauteur} className="pointer-events-none absolute left-0 top-0" aria-hidden>
          <defs>
            <marker id="fleche-workflow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--axis)" />
            </marker>
          </defs>
          {transitionsAvecSource.map((t) => {
            const source = positionDe(t.etape_source_id!);
            const cible = positionDe(t.etape_cible_id);
            const x1 = source.x + LARGEUR_NOEUD;
            const y1 = source.y + HAUTEUR_NOEUD / 2;
            const x2 = cible.x;
            const y2 = cible.y + HAUTEUR_NOEUD / 2;
            return (
              <g key={t.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--axis)" strokeWidth={1.5} markerEnd="url(#fleche-workflow)" />
              </g>
            );
          })}
        </svg>

        {(etapes ?? []).map((e) => {
          const pos = positionDe(e.id);
          return (
            <div
              key={e.id}
              onPointerDown={(ev) => onPointerDownNoeud(ev, e.id)}
              className={cn(
                'absolute flex touch-none select-none flex-col items-center justify-center rounded-lg border-2 bg-card px-2 text-center shadow-sm',
                peutModifier ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
              )}
              style={{
                left: pos.x,
                top: pos.y,
                width: LARGEUR_NOEUD,
                height: HAUTEUR_NOEUD,
                borderColor: couleurReferentiel(e.couleur) ?? COULEUR_PAR_TYPE[e.type_etape] ?? 'var(--st-neutral)',
              }}
            >
              <span className="max-w-full truncate text-[13px] font-semibold">{e.libelle}</span>
              <span className="text-[11px] text-muted-foreground">{LIBELLE_TYPE[e.type_etape] ?? e.type_etape}</span>
            </div>
          );
        })}

        {/* Libellés des transitions au-dessus des nœuds pour rester lisibles quand les étapes sont proches. */}
        <svg width={largeur} height={hauteur} className="pointer-events-none absolute left-0 top-0" aria-hidden>
          {transitionsAvecSource.map((t) => {
            const source = positionDe(t.etape_source_id!);
            const cible = positionDe(t.etape_cible_id);
            const milieuX = (source.x + LARGEUR_NOEUD + cible.x) / 2;
            const milieuY = (source.y + cible.y + HAUTEUR_NOEUD) / 2;
            const largeurEtiquette = Math.max(48, t.libelle_action.length * 6 + 14);
            return (
              <g key={t.id}>
                <rect
                  x={milieuX - largeurEtiquette / 2}
                  y={milieuY - 9}
                  width={largeurEtiquette}
                  height={18}
                  rx={9}
                  fill="var(--card)"
                  stroke="var(--border)"
                />
                <text x={milieuX} y={milieuY + 4} fontSize={11} textAnchor="middle" fill="var(--muted-foreground)">
                  {t.libelle_action}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {transitionsSansSource.length > 0 && (
        <p className="mt-2 text-[13px] text-muted-foreground">
          Transitions possibles depuis n'importe quelle étape : {transitionsSansSource.map((t) => t.libelle_action).join(', ')}.
        </p>
      )}
    </div>
  );
}
