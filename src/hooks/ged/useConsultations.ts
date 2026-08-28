import { useEffect } from 'react';
import { tracerConsultation } from '../../services/ged/consultations';

// Trace une consultation à l'ouverture de la fiche document — une fois par
// montage, silencieusement (l'échec de traçage ne doit pas bloquer l'affichage).
export function useTracerConsultation(documentId: string | undefined) {
  useEffect(() => {
    if (!documentId) return;
    tracerConsultation(documentId).catch(() => {});
  }, [documentId]);
}
