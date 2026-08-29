import { listWorkflowEtapes } from '../administration/workflows';
import type { Database } from '../../types/database';

// Types génériques du moteur de workflow (workflow_instances/workflow_etapes/
// workflow_historique), sans rien de spécifique à un module.
//
// Contrairement à l'ancienne API Supabase (lecture directe par id, RLS
// scopant la visibilité via l'objet porteur), le backend NestJS n'expose pas
// de route générique par id de workflow_instances/workflow_historique — cf.
// MIGRATION.md Phase 2 : "exposer ces routes maintenant lirait n'importe
// quelle instance par id sans contrôle d'org". Chaque module (Courrier/GED/
// Missions) expose donc son propre endpoint scopé par l'objet porteur
// (courrierId/versementId/missionId) — voir services/courrier/workflow.ts,
// services/ged/versements.ts, services/missions/missions.ts.
export type WorkflowInstance = Database['public']['Tables']['workflow_instances']['Row'];
export type WorkflowEtape = Database['public']['Tables']['workflow_etapes']['Row'];
export type WorkflowHistoriqueEntree = Database['public']['Tables']['workflow_historique']['Row'];

// Seule fonction réellement générique (prend un workflowDefinitionId, pas un
// id d'instance) : même endpoint que l'administration des workflows.
export { listWorkflowEtapes };
