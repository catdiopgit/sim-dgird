// Généré par introspection SQL directe (scratchpad/gen-types.mjs) en l'absence
// de Docker/access-token requis par `supabase gen types typescript` dans cet
// environnement. À régénérer avec la commande officielle dès que possible:
// npx supabase gen types typescript --linked --schema public > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      actions: {
        Row: {
          id: string;
          code: string;
          libelle: string;
        };
        Insert: {
          id?: string;
          code: string;
          libelle: string;
        };
        Update: {
          id?: string;
          code?: string;
          libelle?: string;
        };
        Relationships: [];
      };
      activites: {
        Row: {
          id: string;
          phase_id: string;
          nom: string;
          description: string | null;
          responsable_id: string | null;
          date_debut_prevue: string | null;
          date_fin_prevue: string | null;
          date_debut_reelle: string | null;
          date_fin_reelle: string | null;
          statut_valeur_id: string | null;
          avancement_pct: number;
          ordre: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          phase_id: string;
          nom: string;
          description?: string | null;
          responsable_id?: string | null;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          statut_valeur_id?: string | null;
          avancement_pct?: number;
          ordre?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phase_id?: string;
          nom?: string;
          description?: string | null;
          responsable_id?: string | null;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          statut_valeur_id?: string | null;
          avancement_pct?: number;
          ordre?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      courrier_destinataires: {
        Row: {
          id: string;
          courrier_id: string;
          entite_id: string | null;
          utilisateur_id: string | null;
          contact_id: string | null;
          type_diffusion: Database['public']['Enums']['type_diffusion_courrier'];
          date_prise_connaissance: string | null;
          instruction: string | null;
          echeance: string | null;
          type_action: Database['public']['Enums']['type_action_courrier'] | null;
          workflow_historique_id: string | null;
        };
        Insert: {
          id?: string;
          courrier_id: string;
          entite_id?: string | null;
          utilisateur_id?: string | null;
          contact_id?: string | null;
          type_diffusion?: Database['public']['Enums']['type_diffusion_courrier'];
          date_prise_connaissance?: string | null;
          instruction?: string | null;
          echeance?: string | null;
          type_action?: Database['public']['Enums']['type_action_courrier'] | null;
          workflow_historique_id?: string | null;
        };
        Update: {
          id?: string;
          courrier_id?: string;
          entite_id?: string | null;
          utilisateur_id?: string | null;
          contact_id?: string | null;
          type_diffusion?: Database['public']['Enums']['type_diffusion_courrier'];
          date_prise_connaissance?: string | null;
          instruction?: string | null;
          echeance?: string | null;
          type_action?: Database['public']['Enums']['type_action_courrier'] | null;
          workflow_historique_id?: string | null;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: string;
          organisation_id: string;
          nom: string;
          type: string;
          email: string | null;
          telephone: string | null;
          adresse: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          supprime_le: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          nom: string;
          type?: string;
          email?: string | null;
          telephone?: string | null;
          adresse?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          nom?: string;
          type?: string;
          email?: string | null;
          telephone?: string | null;
          adresse?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Relationships: [];
      };
      delegations: {
        Row: {
          id: string;
          delegant_id: string;
          delegataire_id: string;
          module_id: string | null;
          entite_id: string | null;
          date_debut: string;
          date_fin: string | null;
          motif: string | null;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          delegant_id: string;
          delegataire_id: string;
          module_id?: string | null;
          entite_id?: string | null;
          date_debut?: string;
          date_fin?: string | null;
          motif?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          delegant_id?: string;
          delegataire_id?: string;
          module_id?: string | null;
          entite_id?: string | null;
          date_debut?: string;
          date_fin?: string | null;
          motif?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      courrier_pieces_jointes: {
        Row: {
          id: string;
          courrier_id: string;
          document_id: string | null;
          storage_path: string | null;
          nom_fichier: string;
          taille_octets: number | null;
          type_mime: string | null;
          hash_sha256: string | null;
          est_scan: boolean;
          est_decharge: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          courrier_id: string;
          document_id?: string | null;
          storage_path?: string | null;
          nom_fichier: string;
          taille_octets?: number | null;
          type_mime?: string | null;
          hash_sha256?: string | null;
          est_scan?: boolean;
          est_decharge?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          courrier_id?: string;
          document_id?: string | null;
          storage_path?: string | null;
          nom_fichier?: string;
          taille_octets?: number | null;
          type_mime?: string | null;
          hash_sha256?: string | null;
          est_scan?: boolean;
          est_decharge?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      courriers: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string | null;
          sens: Database['public']['Enums']['sens_courrier'];
          numero: string;
          type_valeur_id: string | null;
          priorite_valeur_id: string | null;
          confidentialite_valeur_id: string | null;
          mode_transmission_valeur_id: string | null;
          objet: string;
          date_courrier: string;
          date_reception: string | null;
          date_envoi: string | null;
          expediteur_nom: string | null;
          expediteur_type_valeur_id: string | null;
          expediteur_contact_id: string | null;
          destinataire_texte: string | null;
          entite_destinataire_id: string | null;
          agent_destinataire_id: string | null;
          contact_destinataire_id: string | null;
          statut_reception_valeur_id: string | null;
          reference_expediteur: string | null;
          redacteur_id: string | null;
          workflow_instance_id: string | null;
          etape_code: string | null;
          etape_libelle: string | null;
          courrier_parent_id: string | null;
          observations: string | null;
          verrouille_le: string | null;
          verrouille_par: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          supprime_le: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          entite_id?: string | null;
          sens: Database['public']['Enums']['sens_courrier'];
          numero: string;
          type_valeur_id?: string | null;
          priorite_valeur_id?: string | null;
          confidentialite_valeur_id?: string | null;
          mode_transmission_valeur_id?: string | null;
          objet: string;
          date_courrier?: string;
          date_reception?: string | null;
          date_envoi?: string | null;
          expediteur_nom?: string | null;
          expediteur_type_valeur_id?: string | null;
          expediteur_contact_id?: string | null;
          destinataire_texte?: string | null;
          entite_destinataire_id?: string | null;
          agent_destinataire_id?: string | null;
          contact_destinataire_id?: string | null;
          statut_reception_valeur_id?: string | null;
          reference_expediteur?: string | null;
          redacteur_id?: string | null;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          courrier_parent_id?: string | null;
          observations?: string | null;
          verrouille_le?: string | null;
          verrouille_par?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string | null;
          sens?: Database['public']['Enums']['sens_courrier'];
          numero?: string;
          type_valeur_id?: string | null;
          priorite_valeur_id?: string | null;
          confidentialite_valeur_id?: string | null;
          mode_transmission_valeur_id?: string | null;
          objet?: string;
          date_courrier?: string;
          date_reception?: string | null;
          date_envoi?: string | null;
          expediteur_nom?: string | null;
          expediteur_type_valeur_id?: string | null;
          expediteur_contact_id?: string | null;
          destinataire_texte?: string | null;
          entite_destinataire_id?: string | null;
          agent_destinataire_id?: string | null;
          contact_destinataire_id?: string | null;
          statut_reception_valeur_id?: string | null;
          reference_expediteur?: string | null;
          redacteur_id?: string | null;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          courrier_parent_id?: string | null;
          observations?: string | null;
          verrouille_le?: string | null;
          verrouille_par?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Relationships: [];
      };
      document_droits: {
        Row: {
          id: string;
          document_id: string;
          role_id: string | null;
          utilisateur_id: string | null;
          entite_id: string | null;
          action_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          role_id?: string | null;
          utilisateur_id?: string | null;
          entite_id?: string | null;
          action_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          role_id?: string | null;
          utilisateur_id?: string | null;
          entite_id?: string | null;
          action_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      document_versions: {
        Row: {
          id: string;
          document_id: string;
          version_majeure: number;
          version_mineure: number;
          storage_path: string;
          nom_fichier: string;
          taille_octets: number | null;
          type_mime: string | null;
          hash_sha256: string | null;
          commentaire: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          version_majeure?: number;
          version_mineure?: number;
          storage_path: string;
          nom_fichier: string;
          taille_octets?: number | null;
          type_mime?: string | null;
          hash_sha256?: string | null;
          commentaire?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          version_majeure?: number;
          version_mineure?: number;
          storage_path?: string;
          nom_fichier?: string;
          taille_octets?: number | null;
          type_mime?: string | null;
          hash_sha256?: string | null;
          commentaire?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          organisation_id: string;
          versement_id: string | null;
          dossier_id: string | null;
          categorie_id: string | null;
          entite_id: string | null;
          projet_id: string | null;
          livrable_id: string | null;
          avenant_id: string | null;
          decaissement_id: string | null;
          mission_id: string | null;
          type_projet_valeur_id: string | null;
          marche_id: string | null;
          phase_marche_id: string | null;
          marche_candidat_id: string | null;
          type_marche_valeur_id: string | null;
          titre: string;
          description: string | null;
          metadata: Json;
          mots_cles: string[];
          version_courante_id: string | null;
          confidentialite_valeur_id: string | null;
          duree_conservation_mois: number | null;
          date_versement: string;
          date_archivage: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          supprime_le: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          versement_id?: string | null;
          dossier_id?: string | null;
          categorie_id?: string | null;
          entite_id?: string | null;
          projet_id?: string | null;
          livrable_id?: string | null;
          avenant_id?: string | null;
          decaissement_id?: string | null;
          mission_id?: string | null;
          type_projet_valeur_id?: string | null;
          titre: string;
          description?: string | null;
          metadata?: Json;
          mots_cles?: string[];
          version_courante_id?: string | null;
          confidentialite_valeur_id?: string | null;
          duree_conservation_mois?: number | null;
          date_versement?: string;
          date_archivage?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          versement_id?: string | null;
          dossier_id?: string | null;
          categorie_id?: string | null;
          entite_id?: string | null;
          projet_id?: string | null;
          livrable_id?: string | null;
          avenant_id?: string | null;
          decaissement_id?: string | null;
          mission_id?: string | null;
          type_projet_valeur_id?: string | null;
          titre?: string;
          description?: string | null;
          metadata?: Json;
          mots_cles?: string[];
          version_courante_id?: string | null;
          confidentialite_valeur_id?: string | null;
          duree_conservation_mois?: number | null;
          date_versement?: string;
          date_archivage?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Relationships: [];
      };
      ged_versements: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string | null;
          dossier_cible_id: string | null;
          objet: string;
          description: string | null;
          brouillon: boolean;
          workflow_instance_id: string | null;
          etape_code: string | null;
          etape_libelle: string | null;
          redacteur_id: string | null;
          created_at: string;
          updated_at: string;
          supprime_le: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          entite_id?: string | null;
          dossier_cible_id?: string | null;
          objet: string;
          description?: string | null;
          brouillon?: boolean;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          redacteur_id?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string | null;
          dossier_cible_id?: string | null;
          objet?: string;
          description?: string | null;
          brouillon?: boolean;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          redacteur_id?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Relationships: [];
      };
      ged_consultations: {
        Row: {
          id: string;
          document_id: string;
          utilisateur_id: string | null;
          type_acces: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          utilisateur_id?: string | null;
          type_acces: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_id?: string;
          utilisateur_id?: string | null;
          type_acces?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      dossier_droits: {
        Row: {
          id: string;
          dossier_id: string;
          role_id: string | null;
          utilisateur_id: string | null;
          entite_id: string | null;
          action_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          dossier_id: string;
          role_id?: string | null;
          utilisateur_id?: string | null;
          entite_id?: string | null;
          action_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          dossier_id?: string;
          role_id?: string | null;
          utilisateur_id?: string | null;
          entite_id?: string | null;
          action_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      entites: {
        Row: {
          id: string;
          organisation_id: string;
          parent_entite_id: string | null;
          type_entite_id: string;
          code: string;
          libelle: string;
          sigle: string | null;
          responsable_utilisateur_id: string | null;
          personne_receptrice_id: string | null;
          chemin: unknown | null;
          niveau: number;
          ordre: number;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          parent_entite_id?: string | null;
          type_entite_id: string;
          code: string;
          libelle: string;
          sigle?: string | null;
          responsable_utilisateur_id?: string | null;
          personne_receptrice_id?: string | null;
          chemin?: unknown | null;
          niveau?: number;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          parent_entite_id?: string | null;
          type_entite_id?: string;
          code?: string;
          libelle?: string;
          sigle?: string | null;
          responsable_utilisateur_id?: string | null;
          personne_receptrice_id?: string | null;
          chemin?: unknown | null;
          niveau?: number;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fonctions: {
        Row: {
          id: string;
          organisation_id: string;
          code: string;
          libelle: string;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          code: string;
          libelle: string;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          code?: string;
          libelle?: string;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ged_categories: {
        Row: {
          id: string;
          organisation_id: string;
          parent_categorie_id: string | null;
          code: string;
          libelle: string;
          description: string | null;
          duree_conservation_mois: number | null;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          parent_categorie_id?: string | null;
          code: string;
          libelle: string;
          description?: string | null;
          duree_conservation_mois?: number | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          parent_categorie_id?: string | null;
          code?: string;
          libelle?: string;
          description?: string | null;
          duree_conservation_mois?: number | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ged_dossiers: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string | null;
          parent_dossier_id: string | null;
          code: string;
          libelle: string;
          description: string | null;
          categorie_id: string | null;
          chemin: unknown | null;
          niveau: number;
          icone: string | null;
          couleur: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          supprime_le: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          entite_id?: string | null;
          parent_dossier_id?: string | null;
          code: string;
          libelle: string;
          description?: string | null;
          categorie_id?: string | null;
          chemin?: unknown | null;
          niveau?: number;
          icone?: string | null;
          couleur?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string | null;
          parent_dossier_id?: string | null;
          code?: string;
          libelle?: string;
          description?: string | null;
          categorie_id?: string | null;
          chemin?: unknown | null;
          niveau?: number;
          icone?: string | null;
          couleur?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          supprime_le?: string | null;
        };
        Relationships: [];
      };
      archivage_operations: {
        Row: {
          id: string;
          organisation_id: string;
          date_debut: string;
          date_fin: string;
          statut: 'en_preparation' | 'confirmee';
          nombre_courriers: number;
          nombre_projets: number;
          nombre_missions: number;
          prepare_par: string | null;
          prepare_le: string;
          confirme_par: string | null;
          confirme_le: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          date_debut: string;
          date_fin: string;
          statut?: 'en_preparation' | 'confirmee';
          nombre_courriers?: number;
          nombre_projets?: number;
          nombre_missions?: number;
          prepare_par?: string | null;
          prepare_le?: string;
          confirme_par?: string | null;
          confirme_le?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          date_debut?: string;
          date_fin?: string;
          statut?: 'en_preparation' | 'confirmee';
          nombre_courriers?: number;
          nombre_projets?: number;
          nombre_missions?: number;
          prepare_par?: string | null;
          prepare_le?: string;
          confirme_par?: string | null;
          confirme_le?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      archivage_elements: {
        Row: {
          id: string;
          operation_id: string;
          organisation_id: string;
          type_element: 'courrier' | 'projet' | 'mission';
          element_id: string;
          reference: string;
          libelle: string;
          entite_id: string | null;
          date_cloture: string;
          etat: 'eligible' | 'archive' | 'anomalie';
          selectionne: boolean;
          classement: Json;
          motif_anomalie: string | null;
          dossier_ged_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          operation_id: string;
          organisation_id: string;
          type_element: 'courrier' | 'projet' | 'mission';
          element_id: string;
          reference: string;
          libelle: string;
          entite_id?: string | null;
          date_cloture: string;
          etat?: 'eligible' | 'archive' | 'anomalie';
          selectionne?: boolean;
          classement?: Json;
          motif_anomalie?: string | null;
          dossier_ged_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          operation_id?: string;
          organisation_id?: string;
          type_element?: 'courrier' | 'projet' | 'mission';
          element_id?: string;
          reference?: string;
          libelle?: string;
          entite_id?: string | null;
          date_cloture?: string;
          etat?: 'eligible' | 'archive' | 'anomalie';
          selectionne?: boolean;
          classement?: Json;
          motif_anomalie?: string | null;
          dossier_ged_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      journal_audit: {
        Row: {
          id: string;
          utilisateur_id: string | null;
          organisation_id: string | null;
          module_id: string | null;
          action_id: string | null;
          objet_type: string;
          objet_id: string | null;
          ancienne_valeur: Json | null;
          nouvelle_valeur: Json | null;
          adresse_ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id?: string | null;
          organisation_id?: string | null;
          module_id?: string | null;
          action_id?: string | null;
          objet_type: string;
          objet_id?: string | null;
          ancienne_valeur?: Json | null;
          nouvelle_valeur?: Json | null;
          adresse_ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string | null;
          organisation_id?: string | null;
          module_id?: string | null;
          action_id?: string | null;
          objet_type?: string;
          objet_id?: string | null;
          ancienne_valeur?: Json | null;
          nouvelle_valeur?: Json | null;
          adresse_ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      listes_valeurs: {
        Row: {
          id: string;
          organisation_id: string;
          code: string;
          libelle: string;
          module_id: string | null;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          code: string;
          libelle: string;
          module_id?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          code?: string;
          libelle?: string;
          module_id?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      livrables: {
        Row: {
          id: string;
          projet_id: string;
          nom: string;
          description: string | null;
          responsable_utilisateur_id: string | null;
          responsable_contact_id: string | null;
          poids_pct: number;
          date_prevue: string | null;
          date_remise: string | null;
          statut_valeur_id: string | null;
          document_id: string | null;
          workflow_instance_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          nom: string;
          description?: string | null;
          responsable_utilisateur_id?: string | null;
          responsable_contact_id?: string | null;
          poids_pct?: number;
          date_prevue?: string | null;
          date_remise?: string | null;
          statut_valeur_id?: string | null;
          document_id?: string | null;
          workflow_instance_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          nom?: string;
          description?: string | null;
          responsable_utilisateur_id?: string | null;
          responsable_contact_id?: string | null;
          poids_pct?: number;
          date_prevue?: string | null;
          date_remise?: string | null;
          statut_valeur_id?: string | null;
          document_id?: string | null;
          workflow_instance_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      decaissements: {
        Row: {
          id: string;
          projet_id: string;
          avenant_id: string | null;
          pourcentage: number;
          montant: number;
          date_decaissement: string;
          observations: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          avenant_id?: string | null;
          pourcentage: number;
          montant: number;
          date_decaissement?: string;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          avenant_id?: string | null;
          pourcentage?: number;
          montant?: number;
          date_decaissement?: string;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projet_contacts_execution: {
        Row: {
          id: string;
          projet_id: string;
          nom: string;
          fonction: string | null;
          email: string | null;
          telephone: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          nom: string;
          fonction?: string | null;
          email?: string | null;
          telephone?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          nom?: string;
          fonction?: string | null;
          email?: string | null;
          telephone?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      mission_actions_suivi: {
        Row: {
          id: string;
          mission_id: string;
          description: string;
          responsable_id: string | null;
          date_echeance: string | null;
          statut_valeur_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          description: string;
          responsable_id?: string | null;
          date_echeance?: string | null;
          statut_valeur_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          mission_id?: string;
          description?: string;
          responsable_id?: string | null;
          date_echeance?: string | null;
          statut_valeur_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      mission_depenses: {
        Row: {
          id: string;
          mission_id: string;
          libelle: string;
          montant: number;
          date_depense: string;
          justificatif_document_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          mission_id: string;
          libelle: string;
          montant: number;
          date_depense?: string;
          justificatif_document_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          mission_id?: string;
          libelle?: string;
          montant?: number;
          date_depense?: string;
          justificatif_document_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      mission_participants: {
        Row: {
          id: string;
          mission_id: string;
          utilisateur_id: string;
          role_participant_valeur_id: string | null;
        };
        Insert: {
          id?: string;
          mission_id: string;
          utilisateur_id: string;
          role_participant_valeur_id?: string | null;
        };
        Update: {
          id?: string;
          mission_id?: string;
          utilisateur_id?: string;
          role_participant_valeur_id?: string | null;
        };
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string;
          reference: string;
          objet: string;
          responsable_id: string | null;
          lieu: string | null;
          date_depart: string;
          date_retour: string;
          objectifs: string | null;
          activites_prevues: string | null;
          budget_prevu: number | null;
          budget_reel: number | null;
          workflow_instance_id: string | null;
          etape_code: string | null;
          etape_libelle: string | null;
          ordre_mission_document_id: string | null;
          compte_rendu_document_id: string | null;
          pv_document_id: string | null;
          recommandations: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          entite_id: string;
          reference: string;
          objet: string;
          responsable_id?: string | null;
          lieu?: string | null;
          date_depart: string;
          date_retour: string;
          objectifs?: string | null;
          activites_prevues?: string | null;
          budget_prevu?: number | null;
          budget_reel?: number | null;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          ordre_mission_document_id?: string | null;
          compte_rendu_document_id?: string | null;
          pv_document_id?: string | null;
          recommandations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string;
          reference?: string;
          objet?: string;
          responsable_id?: string | null;
          lieu?: string | null;
          date_depart?: string;
          date_retour?: string;
          objectifs?: string | null;
          activites_prevues?: string | null;
          budget_prevu?: number | null;
          budget_reel?: number | null;
          workflow_instance_id?: string | null;
          etape_code?: string | null;
          etape_libelle?: string | null;
          ordre_mission_document_id?: string | null;
          compte_rendu_document_id?: string | null;
          pv_document_id?: string | null;
          recommandations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modeles_courrier: {
        Row: {
          id: string;
          organisation_id: string;
          valeur_liste_id: string | null;
          nom: string;
          contenu: string | null;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          valeur_liste_id?: string | null;
          nom: string;
          contenu?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          valeur_liste_id?: string | null;
          nom?: string;
          contenu?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      modules: {
        Row: {
          id: string;
          code: string;
          libelle: string;
          icone: string | null;
          ordre: number;
          actif: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          libelle: string;
          icone?: string | null;
          ordre?: number;
          actif?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          libelle?: string;
          icone?: string | null;
          ordre?: number;
          actif?: boolean;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          destinataire_id: string;
          module_id: string | null;
          type_valeur_id: string | null;
          titre: string;
          message: string | null;
          objet_module: string | null;
          objet_id: string | null;
          lien_url: string | null;
          lu: boolean;
          lu_le: string | null;
          canal: Database['public']['Enums']['canal_notification'];
          envoye_le: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          destinataire_id: string;
          module_id?: string | null;
          type_valeur_id?: string | null;
          titre: string;
          message?: string | null;
          objet_module?: string | null;
          objet_id?: string | null;
          lien_url?: string | null;
          lu?: boolean;
          lu_le?: string | null;
          canal?: Database['public']['Enums']['canal_notification'];
          envoye_le?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          destinataire_id?: string;
          module_id?: string | null;
          type_valeur_id?: string | null;
          titre?: string;
          message?: string | null;
          objet_module?: string | null;
          objet_id?: string | null;
          lien_url?: string | null;
          lu?: boolean;
          lu_le?: string | null;
          canal?: Database['public']['Enums']['canal_notification'];
          envoye_le?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      organisations: {
        Row: {
          id: string;
          code: string;
          nom: string;
          description: string | null;
          logo_url: string | null;
          couleur_primaire: string | null;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          nom: string;
          description?: string | null;
          logo_url?: string | null;
          couleur_primaire?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          nom?: string;
          description?: string | null;
          logo_url?: string | null;
          couleur_primaire?: string | null;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      parametres_organisation: {
        Row: {
          id: string;
          organisation_id: string;
          cle: string;
          valeur: Json;
          description: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          cle: string;
          valeur: Json;
          description?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          cle?: string;
          valeur?: Json;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      parametres_smtp: {
        Row: {
          id: string;
          organisation_id: string;
          hote: string;
          port: number;
          securite: string;
          utilisateur: string;
          adresse_expediteur: string;
          nom_expediteur: string | null;
          actif: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          hote: string;
          port?: number;
          securite?: string;
          utilisateur: string;
          adresse_expediteur: string;
          nom_expediteur?: string | null;
          actif?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          hote?: string;
          port?: number;
          securite?: string;
          utilisateur?: string;
          adresse_expediteur?: string;
          nom_expediteur?: string | null;
          actif?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          role_id: string;
          module_id: string;
          action_id: string;
          portee: Database['public']['Enums']['portee_permission'];
          created_at: string;
        };
        Insert: {
          id?: string;
          role_id: string;
          module_id: string;
          action_id: string;
          portee?: Database['public']['Enums']['portee_permission'];
          created_at?: string;
        };
        Update: {
          id?: string;
          role_id?: string;
          module_id?: string;
          action_id?: string;
          portee?: Database['public']['Enums']['portee_permission'];
          created_at?: string;
        };
        Relationships: [];
      };
      phases: {
        Row: {
          id: string;
          projet_id: string;
          code: string;
          nom: string;
          description: string | null;
          ordre: number;
          date_debut_prevue: string | null;
          date_fin_prevue: string | null;
          date_debut_reelle: string | null;
          date_fin_reelle: string | null;
          statut_valeur_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          code: string;
          nom: string;
          description?: string | null;
          ordre?: number;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          statut_valeur_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          code?: string;
          nom?: string;
          description?: string | null;
          ordre?: number;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          statut_valeur_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projet_decisions: {
        Row: {
          id: string;
          projet_id: string;
          titre: string;
          description: string | null;
          date_decision: string;
          decideur_id: string | null;
          impact: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          titre: string;
          description?: string | null;
          date_decision?: string;
          decideur_id?: string | null;
          impact?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          titre?: string;
          description?: string | null;
          date_decision?: string;
          decideur_id?: string | null;
          impact?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projet_indicateurs: {
        Row: {
          id: string;
          projet_id: string;
          code: string;
          libelle: string;
          valeur_cible: number | null;
          valeur_actuelle: number | null;
          unite: string | null;
          date_mesure: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          code: string;
          libelle: string;
          valeur_cible?: number | null;
          valeur_actuelle?: number | null;
          unite?: string | null;
          date_mesure?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          code?: string;
          libelle?: string;
          valeur_cible?: number | null;
          valeur_actuelle?: number | null;
          unite?: string | null;
          date_mesure?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      projet_membres: {
        Row: {
          id: string;
          projet_id: string;
          utilisateur_id: string;
          role_equipe_valeur_id: string | null;
          peut_modifier: boolean;
          date_ajout: string;
          date_retrait: string | null;
        };
        Insert: {
          id?: string;
          projet_id: string;
          utilisateur_id: string;
          role_equipe_valeur_id?: string | null;
          peut_modifier?: boolean;
          date_ajout?: string;
          date_retrait?: string | null;
        };
        Update: {
          id?: string;
          projet_id?: string;
          utilisateur_id?: string;
          role_equipe_valeur_id?: string | null;
          peut_modifier?: boolean;
          date_ajout?: string;
          date_retrait?: string | null;
        };
        Relationships: [];
      };
      projet_problemes: {
        Row: {
          id: string;
          projet_id: string;
          titre: string;
          description: string | null;
          gravite_valeur_id: string | null;
          statut_valeur_id: string | null;
          responsable_id: string | null;
          date_signalement: string;
          date_resolution: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          titre: string;
          description?: string | null;
          gravite_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          responsable_id?: string | null;
          date_signalement?: string;
          date_resolution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          titre?: string;
          description?: string | null;
          gravite_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          responsable_id?: string | null;
          date_signalement?: string;
          date_resolution?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projet_reunion_participants: {
        Row: {
          id: string;
          reunion_id: string;
          utilisateur_id: string;
          present: boolean;
        };
        Insert: {
          id?: string;
          reunion_id: string;
          utilisateur_id: string;
          present?: boolean;
        };
        Update: {
          id?: string;
          reunion_id?: string;
          utilisateur_id?: string;
          present?: boolean;
        };
        Relationships: [];
      };
      projet_reunions: {
        Row: {
          id: string;
          projet_id: string;
          titre: string;
          date_reunion: string;
          lieu: string | null;
          compte_rendu: string | null;
          animateur_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          titre: string;
          date_reunion: string;
          lieu?: string | null;
          compte_rendu?: string | null;
          animateur_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          titre?: string;
          date_reunion?: string;
          lieu?: string | null;
          compte_rendu?: string | null;
          animateur_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projet_risques: {
        Row: {
          id: string;
          projet_id: string;
          titre: string;
          description: string | null;
          probabilite_valeur_id: string | null;
          impact_valeur_id: string | null;
          statut_valeur_id: string | null;
          responsable_id: string | null;
          actions_mitigation: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          titre: string;
          description?: string | null;
          probabilite_valeur_id?: string | null;
          impact_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          responsable_id?: string | null;
          actions_mitigation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          titre?: string;
          description?: string | null;
          probabilite_valeur_id?: string | null;
          impact_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          responsable_id?: string | null;
          actions_mitigation?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projets: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string;
          code: string;
          nom: string;
          description: string | null;
          responsable_id: string | null;
          financement: string | null;
          coordonnateur_id: string | null;
          lieu_execution: string | null;
          date_debut: string | null;
          date_fin_prevue: string | null;
          date_fin_reelle: string | null;
          budget_prevu: number | null;
          budget_reel: number | null;
          statut_valeur_id: string | null;
          priorite_valeur_id: string | null;
          avancement_pct: number;
          organisme_execution_type: Database['public']['Enums']['organisme_execution_type'];
          organisme_execution_nom: string | null;
          charge_execution_utilisateur_id: string | null;
          charge_execution_contact_id: string | null;
          portee_visibilite: Database['public']['Enums']['portee_visibilite_projet'];
          cloture_statut: Database['public']['Enums']['statut_cloture_projet'];
          cloture_demandee_par: string | null;
          cloture_demandee_le: string | null;
          cloture_confirmee_par: string | null;
          cloture_confirmee_le: string | null;
          cloture_motif_rejet: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          entite_id: string;
          code: string;
          nom: string;
          description?: string | null;
          responsable_id?: string | null;
          financement?: string | null;
          coordonnateur_id?: string | null;
          lieu_execution?: string | null;
          date_debut?: string | null;
          date_fin_prevue?: string | null;
          date_fin_reelle?: string | null;
          budget_prevu?: number | null;
          budget_reel?: number | null;
          statut_valeur_id?: string | null;
          priorite_valeur_id?: string | null;
          avancement_pct?: number;
          organisme_execution_type?: Database['public']['Enums']['organisme_execution_type'];
          organisme_execution_nom?: string | null;
          charge_execution_utilisateur_id?: string | null;
          charge_execution_contact_id?: string | null;
          portee_visibilite?: Database['public']['Enums']['portee_visibilite_projet'];
          cloture_statut?: Database['public']['Enums']['statut_cloture_projet'];
          cloture_demandee_par?: string | null;
          cloture_demandee_le?: string | null;
          cloture_confirmee_par?: string | null;
          cloture_confirmee_le?: string | null;
          cloture_motif_rejet?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string;
          code?: string;
          nom?: string;
          description?: string | null;
          responsable_id?: string | null;
          financement?: string | null;
          coordonnateur_id?: string | null;
          lieu_execution?: string | null;
          date_debut?: string | null;
          date_fin_prevue?: string | null;
          date_fin_reelle?: string | null;
          budget_prevu?: number | null;
          budget_reel?: number | null;
          statut_valeur_id?: string | null;
          priorite_valeur_id?: string | null;
          avancement_pct?: number;
          organisme_execution_type?: Database['public']['Enums']['organisme_execution_type'];
          organisme_execution_nom?: string | null;
          charge_execution_utilisateur_id?: string | null;
          charge_execution_contact_id?: string | null;
          portee_visibilite?: Database['public']['Enums']['portee_visibilite_projet'];
          cloture_statut?: Database['public']['Enums']['statut_cloture_projet'];
          cloture_demandee_par?: string | null;
          cloture_demandee_le?: string | null;
          cloture_confirmee_par?: string | null;
          cloture_confirmee_le?: string | null;
          cloture_motif_rejet?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      avenants: {
        Row: {
          id: string;
          projet_id: string;
          reference: string;
          date_avenant: string;
          objet: string;
          description: string | null;
          motif: string | null;
          montant: number | null;
          duree_initiale: string | null;
          nouvelle_duree: string | null;
          date_debut: string | null;
          nouvelle_date_fin: string | null;
          observations: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          reference: string;
          date_avenant?: string;
          objet: string;
          description?: string | null;
          motif?: string | null;
          montant?: number | null;
          duree_initiale?: string | null;
          nouvelle_duree?: string | null;
          date_debut?: string | null;
          nouvelle_date_fin?: string | null;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          reference?: string;
          date_avenant?: string;
          objet?: string;
          description?: string | null;
          motif?: string | null;
          montant?: number | null;
          duree_initiale?: string | null;
          nouvelle_duree?: string | null;
          date_debut?: string | null;
          nouvelle_date_fin?: string | null;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      avenant_livrables: {
        Row: {
          id: string;
          avenant_id: string;
          livrable_id: string | null;
          type_impact: Database['public']['Enums']['type_impact_avenant'];
          echeance_modifiee: boolean;
          contenu_modifie: boolean;
          commentaire: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          avenant_id: string;
          livrable_id?: string | null;
          type_impact: Database['public']['Enums']['type_impact_avenant'];
          echeance_modifiee?: boolean;
          contenu_modifie?: boolean;
          commentaire?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          avenant_id?: string;
          livrable_id?: string | null;
          type_impact?: Database['public']['Enums']['type_impact_avenant'];
          echeance_modifiee?: boolean;
          contenu_modifie?: boolean;
          commentaire?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      projet_visibilite_entites: {
        Row: {
          id: string;
          projet_id: string;
          entite_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          entite_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          entite_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      projet_visibilite_utilisateurs: {
        Row: {
          id: string;
          projet_id: string;
          utilisateur_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          utilisateur_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          projet_id?: string;
          utilisateur_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      regles_numerotation: {
        Row: {
          id: string;
          organisation_id: string;
          module_id: string;
          entite_id: string | null;
          valeur_liste_id: string | null;
          format: string;
          sequence_courante: number;
          reinitialisation: Database['public']['Enums']['reinitialisation_numerotation'];
          derniere_reinitialisation_le: string | null;
          updated_at: string;
          niveau_racine_chemin: number | null;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          module_id: string;
          entite_id?: string | null;
          valeur_liste_id?: string | null;
          format: string;
          sequence_courante?: number;
          reinitialisation?: Database['public']['Enums']['reinitialisation_numerotation'];
          derniere_reinitialisation_le?: string | null;
          updated_at?: string;
          niveau_racine_chemin?: number | null;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          module_id?: string;
          entite_id?: string | null;
          valeur_liste_id?: string | null;
          format?: string;
          sequence_courante?: number;
          reinitialisation?: Database['public']['Enums']['reinitialisation_numerotation'];
          derniere_reinitialisation_le?: string | null;
          updated_at?: string;
          niveau_racine_chemin?: number | null;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          organisation_id: string | null;
          code: string;
          libelle: string;
          description: string | null;
          systeme: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string | null;
          code: string;
          libelle: string;
          description?: string | null;
          systeme?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string | null;
          code?: string;
          libelle?: string;
          description?: string | null;
          systeme?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      taches: {
        Row: {
          id: string;
          activite_id: string;
          nom: string;
          description: string | null;
          responsable_id: string | null;
          priorite_valeur_id: string | null;
          statut_valeur_id: string | null;
          date_debut_prevue: string | null;
          date_echeance: string | null;
          date_completion: string | null;
          avancement_pct: number;
          estimation_heures: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          activite_id: string;
          nom: string;
          description?: string | null;
          responsable_id?: string | null;
          priorite_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          date_debut_prevue?: string | null;
          date_echeance?: string | null;
          date_completion?: string | null;
          avancement_pct?: number;
          estimation_heures?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          activite_id?: string;
          nom?: string;
          description?: string | null;
          responsable_id?: string | null;
          priorite_valeur_id?: string | null;
          statut_valeur_id?: string | null;
          date_debut_prevue?: string | null;
          date_echeance?: string | null;
          date_completion?: string | null;
          avancement_pct?: number;
          estimation_heures?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      type_entites: {
        Row: {
          id: string;
          organisation_id: string;
          code: string;
          libelle: string;
          ordre: number;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          code: string;
          libelle: string;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          code?: string;
          libelle?: string;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      utilisateur_roles: {
        Row: {
          id: string;
          utilisateur_id: string;
          role_id: string;
          entite_id: string | null;
          date_debut: string;
          date_fin: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          utilisateur_id: string;
          role_id: string;
          entite_id?: string | null;
          date_debut?: string;
          date_fin?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          utilisateur_id?: string;
          role_id?: string;
          entite_id?: string | null;
          date_debut?: string;
          date_fin?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      utilisateurs: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string | null;
          matricule: string | null;
          nom: string;
          prenom: string;
          email: string;
          telephone: string | null;
          fonction_id: string | null;
          photo_url: string | null;
          statut: string;
          date_entree: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organisation_id: string;
          entite_id?: string | null;
          matricule?: string | null;
          nom: string;
          prenom: string;
          email: string;
          telephone?: string | null;
          fonction_id?: string | null;
          photo_url?: string | null;
          statut?: string;
          date_entree?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string | null;
          matricule?: string | null;
          nom?: string;
          prenom?: string;
          email?: string;
          telephone?: string | null;
          fonction_id?: string | null;
          photo_url?: string | null;
          statut?: string;
          date_entree?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      valeurs_listes: {
        Row: {
          id: string;
          liste_id: string;
          code: string;
          libelle: string;
          description: string | null;
          couleur: string | null;
          ordre: number;
          valeur_defaut: boolean;
          actif: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          liste_id: string;
          code: string;
          libelle: string;
          description?: string | null;
          couleur?: string | null;
          ordre?: number;
          valeur_defaut?: boolean;
          actif?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          liste_id?: string;
          code?: string;
          libelle?: string;
          description?: string | null;
          couleur?: string | null;
          ordre?: number;
          valeur_defaut?: boolean;
          actif?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_definition_associations: {
        Row: {
          id: string;
          workflow_definition_id: string;
          valeur_liste_id: string;
        };
        Insert: {
          id?: string;
          workflow_definition_id: string;
          valeur_liste_id: string;
        };
        Update: {
          id?: string;
          workflow_definition_id?: string;
          valeur_liste_id?: string;
        };
        Relationships: [];
      };
      workflow_definitions: {
        Row: {
          id: string;
          organisation_id: string;
          module_id: string;
          code: string;
          libelle: string;
          description: string | null;
          version: number;
          actif: boolean;
          est_defaut: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          module_id: string;
          code: string;
          libelle: string;
          description?: string | null;
          version?: number;
          actif?: boolean;
          est_defaut?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          module_id?: string;
          code?: string;
          libelle?: string;
          description?: string | null;
          version?: number;
          actif?: boolean;
          est_defaut?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_etapes: {
        Row: {
          id: string;
          workflow_definition_id: string;
          code: string;
          libelle: string;
          ordre: number;
          type_etape: Database['public']['Enums']['type_etape_workflow'];
          delai_jours: number | null;
          couleur: string | null;
          created_at: string;
          position_x: number | null;
          position_y: number | null;
        };
        Insert: {
          id?: string;
          workflow_definition_id: string;
          code: string;
          libelle: string;
          ordre?: number;
          type_etape?: Database['public']['Enums']['type_etape_workflow'];
          delai_jours?: number | null;
          couleur?: string | null;
          created_at?: string;
          position_x?: number | null;
          position_y?: number | null;
        };
        Update: {
          id?: string;
          workflow_definition_id?: string;
          code?: string;
          libelle?: string;
          ordre?: number;
          type_etape?: Database['public']['Enums']['type_etape_workflow'];
          delai_jours?: number | null;
          couleur?: string | null;
          created_at?: string;
          position_x?: number | null;
          position_y?: number | null;
        };
        Relationships: [];
      };
      workflow_historique: {
        Row: {
          id: string;
          workflow_instance_id: string;
          transition_id: string | null;
          etape_precedente_id: string | null;
          etape_suivante_id: string;
          utilisateur_id: string | null;
          commentaire: string | null;
          date_action: string;
        };
        Insert: {
          id?: string;
          workflow_instance_id: string;
          transition_id?: string | null;
          etape_precedente_id?: string | null;
          etape_suivante_id: string;
          utilisateur_id?: string | null;
          commentaire?: string | null;
          date_action?: string;
        };
        Update: {
          id?: string;
          workflow_instance_id?: string;
          transition_id?: string | null;
          etape_precedente_id?: string | null;
          etape_suivante_id?: string;
          utilisateur_id?: string | null;
          commentaire?: string | null;
          date_action?: string;
        };
        Relationships: [];
      };
      workflow_instances: {
        Row: {
          id: string;
          workflow_definition_id: string;
          etape_courante_id: string;
          statut_instance: Database['public']['Enums']['statut_instance_workflow'];
          demarre_le: string;
          termine_le: string | null;
          created_by: string | null;
          created_at: string;
          etape_courante_depuis: string;
        };
        Insert: {
          id?: string;
          workflow_definition_id: string;
          etape_courante_id: string;
          statut_instance?: Database['public']['Enums']['statut_instance_workflow'];
          demarre_le?: string;
          termine_le?: string | null;
          created_by?: string | null;
          created_at?: string;
          etape_courante_depuis?: string;
        };
        Update: {
          id?: string;
          workflow_definition_id?: string;
          etape_courante_id?: string;
          statut_instance?: Database['public']['Enums']['statut_instance_workflow'];
          demarre_le?: string;
          termine_le?: string | null;
          created_by?: string | null;
          created_at?: string;
          etape_courante_depuis?: string;
        };
        Relationships: [];
      };
      workflow_transition_roles: {
        Row: {
          id: string;
          workflow_transition_id: string;
          role_id: string | null;
          type_acteur: Database['public']['Enums']['type_acteur_workflow'];
          fonction_id: string | null;
          entite_id: string | null;
          utilisateur_id: string | null;
        };
        Insert: {
          id?: string;
          workflow_transition_id: string;
          role_id?: string | null;
          type_acteur?: Database['public']['Enums']['type_acteur_workflow'];
          fonction_id?: string | null;
          entite_id?: string | null;
          utilisateur_id?: string | null;
        };
        Update: {
          id?: string;
          workflow_transition_id?: string;
          role_id?: string | null;
          type_acteur?: Database['public']['Enums']['type_acteur_workflow'];
          fonction_id?: string | null;
          entite_id?: string | null;
          utilisateur_id?: string | null;
        };
        Relationships: [];
      };
      workflow_transitions: {
        Row: {
          id: string;
          workflow_definition_id: string;
          etape_source_id: string | null;
          etape_cible_id: string;
          code: string;
          libelle_action: string;
          condition: Json | null;
          type_action: Database['public']['Enums']['type_action_courrier'] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_definition_id: string;
          etape_source_id?: string | null;
          etape_cible_id: string;
          code: string;
          libelle_action: string;
          condition?: Json | null;
          type_action?: Database['public']['Enums']['type_action_courrier'] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_definition_id?: string;
          etape_source_id?: string | null;
          etape_cible_id?: string;
          code?: string;
          libelle_action?: string;
          condition?: Json | null;
          type_action?: Database['public']['Enums']['type_action_courrier'] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      courrier_destinataire_actions: {
        Row: {
          id: string;
          courrier_destinataire_id: string;
          valeur_liste_id: string;
        };
        Insert: {
          id?: string;
          courrier_destinataire_id: string;
          valeur_liste_id: string;
        };
        Update: {
          id?: string;
          courrier_destinataire_id?: string;
          valeur_liste_id?: string;
        };
        Relationships: [];
      };
      types_marche: {
        Row: {
          id: string;
          organisation_id: string;
          code: string;
          libelle: string;
          description: string | null;
          ordre: number;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id: string;
          code: string;
          libelle: string;
          description?: string | null;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          code?: string;
          libelle?: string;
          description?: string | null;
          ordre?: number;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      phases_type_marche: {
        Row: {
          id: string;
          type_marche_id: string;
          nom: string;
          description: string | null;
          ordre: number;
          duree: number;
          unite_duree: 'jour' | 'semaine' | 'mois';
          obligatoire: boolean;
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          type_marche_id: string;
          nom: string;
          description?: string | null;
          ordre?: number;
          duree?: number;
          unite_duree?: 'jour' | 'semaine' | 'mois';
          obligatoire?: boolean;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          type_marche_id?: string;
          nom?: string;
          description?: string | null;
          ordre?: number;
          duree?: number;
          unite_duree?: 'jour' | 'semaine' | 'mois';
          obligatoire?: boolean;
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marches: {
        Row: {
          id: string;
          organisation_id: string;
          entite_id: string;
          reference: string;
          objet: string;
          description: string | null;
          type_marche_id: string;
          responsable_id: string | null;
          date_debut_prevue: string | null;
          date_fin_prevue: string | null;
          montant_estimatif: number | null;
          observations: string | null;
          statut_cloture: 'en_cours' | 'cloture';
          cloture_par: string | null;
          cloture_le: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organisation_id?: string;
          entite_id: string;
          reference: string;
          objet: string;
          description?: string | null;
          type_marche_id: string;
          responsable_id?: string | null;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          montant_estimatif?: number | null;
          observations?: string | null;
          statut_cloture?: 'en_cours' | 'cloture';
          cloture_par?: string | null;
          cloture_le?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organisation_id?: string;
          entite_id?: string;
          reference?: string;
          objet?: string;
          description?: string | null;
          type_marche_id?: string;
          responsable_id?: string | null;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          montant_estimatif?: number | null;
          observations?: string | null;
          statut_cloture?: 'en_cours' | 'cloture';
          cloture_par?: string | null;
          cloture_le?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      phases_marche: {
        Row: {
          id: string;
          marche_id: string;
          phase_type_marche_id: string | null;
          nom: string;
          description: string | null;
          ordre: number;
          duree_prevue: number;
          unite_duree: 'jour' | 'semaine' | 'mois';
          obligatoire: boolean;
          date_debut_prevue: string | null;
          date_fin_prevue: string | null;
          date_debut_reelle: string | null;
          date_fin_reelle: string | null;
          observations: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          marche_id: string;
          phase_type_marche_id?: string | null;
          nom: string;
          description?: string | null;
          ordre?: number;
          duree_prevue: number;
          unite_duree?: 'jour' | 'semaine' | 'mois';
          obligatoire?: boolean;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          observations?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          marche_id?: string;
          phase_type_marche_id?: string | null;
          nom?: string;
          description?: string | null;
          ordre?: number;
          duree_prevue?: number;
          unite_duree?: 'jour' | 'semaine' | 'mois';
          obligatoire?: boolean;
          date_debut_prevue?: string | null;
          date_fin_prevue?: string | null;
          date_debut_reelle?: string | null;
          date_fin_reelle?: string | null;
          observations?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marche_candidats: {
        Row: {
          id: string;
          marche_id: string;
          nom: string;
          type: 'entreprise' | 'consultant';
          coordonnees: string | null;
          informations_complementaires: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          marche_id: string;
          nom: string;
          type: 'entreprise' | 'consultant';
          coordonnees?: string | null;
          informations_complementaires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          marche_id?: string;
          nom?: string;
          type?: 'entreprise' | 'consultant';
          coordonnees?: string | null;
          informations_complementaires?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      marche_attributions: {
        Row: {
          id: string;
          marche_id: string;
          candidat_attributaire_id: string;
          montant_attribue: number | null;
          date_attribution: string | null;
          observations: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          marche_id: string;
          candidat_attributaire_id: string;
          montant_attribue?: number | null;
          date_attribution?: string | null;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          marche_id?: string;
          candidat_attributaire_id?: string;
          montant_attribue?: number | null;
          date_attribution?: string | null;
          observations?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      organisation_branding: {
        Row: {
          id: string;
          nom: string;
          logo_url: string | null;
          couleur_primaire: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: {
      canal_notification: 'in_app' | 'email' | 'sms' | 'push';
      portee_permission: 'organisation' | 'entite' | 'entite_et_descendants' | 'personnel';
      portee_visibilite_projet: 'membres' | 'entites' | 'agents' | 'tous';
      organisme_execution_type: 'organisation' | 'consultant' | 'entreprise' | 'externe';
      unite_duree_phase: 'jour' | 'semaine' | 'mois';
      statut_cloture_marche: 'en_cours' | 'cloture';
      type_candidat_marche: 'entreprise' | 'consultant';
      statut_cloture_projet: 'aucune' | 'demandee' | 'confirmee' | 'rejetee';
      type_impact_avenant: 'cree' | 'modifie' | 'supprime';
      reinitialisation_numerotation: 'annuelle' | 'mensuelle' | 'jamais';
      sens_courrier: 'entrant' | 'sortant' | 'interne';
      statut_instance_workflow: 'en_cours' | 'terminee' | 'annulee';
      type_diffusion_courrier: 'principal' | 'copie';
      type_etape_workflow: 'initiale' | 'intermediaire' | 'finale' | 'rejet';
      type_action_courrier: 'imputation' | 'affectation' | 'transmission' | 'redirection';
      type_acteur_workflow:
        | 'role'
        | 'fonction'
        | 'entite'
        | 'entite_et_descendants'
        | 'utilisateur'
        | 'responsable_entite_courante'
        | 'superieur_hierarchique_courant';
    };
    CompositeTypes: Record<string, never>;
  };
};
