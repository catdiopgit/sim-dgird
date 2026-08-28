import { Typography } from 'antd';
import { useMemo, useRef, useState } from 'react';
import {
  useWorkflowEtapeMutations,
  useWorkflowEtapes,
  useWorkflowTransitions,
} from '../../../hooks/administration/useWorkflowsAdmin';

interface Props {
  workflowDefinitionId: string;
  peutModifier: boolean;
}

const LARGEUR_NOEUD = 168;
const HAUTEUR_NOEUD = 56;
const ESPACEMENT_X = 210;

const COULEUR_PAR_TYPE: Record<string, string> = {
  initiale: '#1677ff',
  intermediaire: '#8c8c8c',
  finale: '#389e0d',
  rejet: '#cf1322',
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
      <Typography.Title level={5}>Vue graphique</Typography.Title>
      {peutModifier && (
        <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
          Glissez une étape pour la repositionner (enregistré automatiquement).
        </Typography.Paragraph>
      )}
      <div
        ref={conteneurRef}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'relative',
          width: '100%',
          height: hauteur,
          overflow: 'auto',
          border: '1px solid #d9dcd2',
          borderRadius: 4,
          background: '#fafafa',
        }}
      >
        <svg width={largeur} height={hauteur} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <defs>
            <marker id="fleche-workflow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#8c8c8c" />
            </marker>
          </defs>
          {transitionsAvecSource.map((t) => {
            const source = positionDe(t.etape_source_id!);
            const cible = positionDe(t.etape_cible_id);
            const x1 = source.x + LARGEUR_NOEUD;
            const y1 = source.y + HAUTEUR_NOEUD / 2;
            const x2 = cible.x;
            const y2 = cible.y + HAUTEUR_NOEUD / 2;
            const milieuX = (x1 + x2) / 2;
            const milieuY = (y1 + y2) / 2;
            return (
              <g key={t.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#8c8c8c" strokeWidth={1.5} markerEnd="url(#fleche-workflow)" />
                <rect x={milieuX - 32} y={milieuY - 10} width={64} height={16} fill="#fafafa" opacity={0.9} />
                <text x={milieuX} y={milieuY + 2} fontSize={11} textAnchor="middle" fill="#595959">
                  {t.libelle_action}
                </text>
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
              style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: LARGEUR_NOEUD,
                height: HAUTEUR_NOEUD,
                borderRadius: 6,
                border: `2px solid ${e.couleur || COULEUR_PAR_TYPE[e.type_etape] || '#8c8c8c'}`,
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: peutModifier ? 'grab' : 'default',
                userSelect: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                touchAction: 'none',
              }}
            >
              <Typography.Text strong style={{ fontSize: 13 }}>
                {e.libelle}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {e.type_etape}
              </Typography.Text>
            </div>
          );
        })}
      </div>

      {transitionsSansSource.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
          Transitions actionnables depuis n'importe quelle étape :{' '}
          {transitionsSansSource.map((t) => t.libelle_action).join(', ')}.
        </Typography.Paragraph>
      )}
    </div>
  );
}
