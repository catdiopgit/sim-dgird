// Plan de classement de la Direction des Routes (DGIRD), importé du document
// « PLAN DE CLASSEMENT DE LA DIRECTION DES ROUTES » (v8.6). Trois corrections
// par rapport au fichier source, modifiables ensuite par l'archiviste :
//  - A-III : titre ajouté (« Textes législatifs et réglementaires ») ;
//  - CA-VI : « PV autres réunions » était numérotée III dans le document ;
//  - O : série « Généralités » vide dans le document, créée sans sous-série.
export interface NoeudPlan {
  code: string;
  libelle: string;
  ordre: number;
  enfants?: NoeudPlan[];
}

export const PLAN_CLASSEMENT_DR: NoeudPlan[] = [
  {
    "code": "A",
    "libelle": "ADMINISTRATION",
    "ordre": 10,
    "enfants": [
      {
        "code": "A-I",
        "libelle": "COURRIER",
        "ordre": 10,
        "enfants": [
          {
            "code": "A-I-01",
            "libelle": "Courrier Arrivée",
            "ordre": 10
          },
          {
            "code": "A-I-02",
            "libelle": "Courrier Départ",
            "ordre": 20
          },
          {
            "code": "A-I-03",
            "libelle": "Courrier interne",
            "ordre": 30
          },
          {
            "code": "A-I-04",
            "libelle": "Courrier Ministre",
            "ordre": 40
          },
          {
            "code": "A-I-05",
            "libelle": "Notes",
            "ordre": 50
          },
          {
            "code": "A-I-06",
            "libelle": "Rapport d’activités",
            "ordre": 60
          },
          {
            "code": "A-I-07",
            "libelle": "Rapport de mission",
            "ordre": 70
          },
          {
            "code": "A-I-08",
            "libelle": "Rapport passation de service",
            "ordre": 80
          },
          {
            "code": "A-I-09",
            "libelle": "Compte rendu de réunion",
            "ordre": 90
          }
        ]
      },
      {
        "code": "A-II",
        "libelle": "AUDIT",
        "ordre": 20,
        "enfants": [
          {
            "code": "A-II-01",
            "libelle": "Audit interne",
            "ordre": 10
          },
          {
            "code": "A-II-02",
            "libelle": "Audit administratif et financier",
            "ordre": 20
          },
          {
            "code": "A-II-03",
            "libelle": "Audit externe",
            "ordre": 30
          }
        ]
      },
      {
        "code": "A-III",
        "libelle": "TEXTES LÉGISLATIFS ET RÉGLEMENTAIRES",
        "ordre": 30,
        "enfants": [
          {
            "code": "A-III-01",
            "libelle": "Arrêtés",
            "ordre": 10
          },
          {
            "code": "A-III-02",
            "libelle": "Décrets",
            "ordre": 20
          },
          {
            "code": "A-III-03",
            "libelle": "Lois",
            "ordre": 30
          },
          {
            "code": "A-III-04",
            "libelle": "Circulaire",
            "ordre": 40
          },
          {
            "code": "A-III-05",
            "libelle": "Convention",
            "ordre": 50
          },
          {
            "code": "A-III-06",
            "libelle": "Journal officiel",
            "ordre": 60
          },
          {
            "code": "A-III-07",
            "libelle": "Autres",
            "ordre": 70
          }
        ]
      }
    ]
  },
  {
    "code": "B",
    "libelle": "BUDGET - FINANCEMENT/FONCTIONNEMENT",
    "ordre": 20,
    "enfants": [
      {
        "code": "B-I",
        "libelle": "BUDGET",
        "ordre": 10,
        "enfants": [
          {
            "code": "B-I-01",
            "libelle": "Budget Consolidé d’investissement",
            "ordre": 10
          },
          {
            "code": "B-I-02",
            "libelle": "Budget provenant du FERA",
            "ordre": 20
          },
          {
            "code": "B-I-03",
            "libelle": "Autres financements",
            "ordre": 30
          }
        ]
      },
      {
        "code": "B-II",
        "libelle": "FONCTIONNEMENT",
        "ordre": 20,
        "enfants": [
          {
            "code": "B-II-01",
            "libelle": "Gestion parc automobile",
            "ordre": 10
          },
          {
            "code": "B-II-02",
            "libelle": "Carburant",
            "ordre": 20
          },
          {
            "code": "B-II-03",
            "libelle": "Réforme véhicule",
            "ordre": 30
          },
          {
            "code": "B-II-04",
            "libelle": "Matériels de bureau et mobilier",
            "ordre": 40
          }
        ]
      }
    ]
  },
  {
    "code": "C",
    "libelle": "COMPTABILITE",
    "ordre": 30,
    "enfants": [
      {
        "code": "C-I",
        "libelle": "COMPTABILITE",
        "ordre": 10,
        "enfants": [
          {
            "code": "C-I-01",
            "libelle": "Gestion stock (fourniture matériel et mobilier)",
            "ordre": 10
          },
          {
            "code": "C-I-02",
            "libelle": "Déplacement intérieur/extérieur",
            "ordre": 20
          },
          {
            "code": "C-I-03",
            "libelle": "Gestion Ordre de mission",
            "ordre": 30
          },
          {
            "code": "C-I-04",
            "libelle": "Gestion frais médicaux",
            "ordre": 40
          },
          {
            "code": "C-I-05",
            "libelle": "Etat des salaires et charges",
            "ordre": 50
          },
          {
            "code": "C-I-06",
            "libelle": "Autres (justificatifs)",
            "ordre": 60
          }
        ]
      }
    ]
  },
  {
    "code": "CA",
    "libelle": "CONSEILS",
    "ordre": 40,
    "enfants": [
      {
        "code": "CA-I",
        "libelle": "CONSEILS",
        "ordre": 10,
        "enfants": [
          {
            "code": "CA-I-01",
            "libelle": "Conseil d’Administration",
            "ordre": 10
          },
          {
            "code": "CA-I-02",
            "libelle": "Conseil des Ministres",
            "ordre": 20
          },
          {
            "code": "CA-I-03",
            "libelle": "Conseil Présidentielle",
            "ordre": 30
          }
        ]
      },
      {
        "code": "CA-II",
        "libelle": "CONFERENCE",
        "ordre": 20
      },
      {
        "code": "CA-III",
        "libelle": "CONGRES",
        "ordre": 30
      },
      {
        "code": "CA-IV",
        "libelle": "ATELIERS",
        "ordre": 40
      },
      {
        "code": "CA-V",
        "libelle": "SEMINAIRES",
        "ordre": 50
      },
      {
        "code": "CA-VI",
        "libelle": "PV AUTRES REUNIONS",
        "ordre": 60
      }
    ]
  },
  {
    "code": "E",
    "libelle": "ETUDES",
    "ordre": 50,
    "enfants": [
      {
        "code": "E-I",
        "libelle": "DOCUMENTS STRATEGIQUES",
        "ordre": 10,
        "enfants": [
          {
            "code": "E-I-01",
            "libelle": "LPST",
            "ordre": 10
          },
          {
            "code": "E-I-02",
            "libelle": "SDRAN",
            "ordre": 20
          },
          {
            "code": "E-I-03",
            "libelle": "Contrat de performance",
            "ordre": 30
          },
          {
            "code": "E-I-04",
            "libelle": "Plan stratégique",
            "ordre": 40
          }
        ]
      },
      {
        "code": "E-II",
        "libelle": "ETUDES TECHNIQUES",
        "ordre": 20
      },
      {
        "code": "E-III",
        "libelle": "BCDR",
        "ordre": 30,
        "enfants": [
          {
            "code": "E-III-01",
            "libelle": "Documents BCDR",
            "ordre": 10
          },
          {
            "code": "E-III-02",
            "libelle": "SIR",
            "ordre": 20
          },
          {
            "code": "E-III-03",
            "libelle": "Inventaire routier",
            "ordre": 30
          },
          {
            "code": "E-III-04",
            "libelle": "Actualisation du réseau routier",
            "ordre": 40
          }
        ]
      }
    ]
  },
  {
    "code": "I",
    "libelle": "INFORMATIQUE",
    "ordre": 60,
    "enfants": [
      {
        "code": "I-I",
        "libelle": "GESTION PARC INFORMATIQUE",
        "ordre": 10,
        "enfants": [
          {
            "code": "I-I-01",
            "libelle": "Acquisition de matériels informatiques",
            "ordre": 10
          },
          {
            "code": "I-I-02",
            "libelle": "Maintenance informatique",
            "ordre": 20
          }
        ]
      },
      {
        "code": "I-II",
        "libelle": "COMMUNICATION",
        "ordre": 20,
        "enfants": [
          {
            "code": "I-II-01",
            "libelle": "Communication sociale",
            "ordre": 10
          },
          {
            "code": "I-II-02",
            "libelle": "Coupure de presse",
            "ordre": 20
          },
          {
            "code": "I-II-03",
            "libelle": "Procédurier Archivage",
            "ordre": 30
          },
          {
            "code": "I-II-04",
            "libelle": "Inventaire documents",
            "ordre": 40
          }
        ]
      }
    ]
  },
  {
    "code": "INFRA",
    "libelle": "INFRASTRUCTURES",
    "ordre": 70,
    "enfants": [
      {
        "code": "INFRA-I",
        "libelle": "PONTS",
        "ordre": 10,
        "enfants": [
          {
            "code": "INFRA-I-01",
            "libelle": "Ouvrage d’art",
            "ordre": 10
          },
          {
            "code": "INFRA-I-02",
            "libelle": "Inspection des OA",
            "ordre": 20
          },
          {
            "code": "INFRA-I-03",
            "libelle": "Suivi travaux OA",
            "ordre": 30
          }
        ]
      },
      {
        "code": "INFRA-II",
        "libelle": "BACS",
        "ordre": 20,
        "enfants": [
          {
            "code": "INFRA-II-01",
            "libelle": "Acquisition de bacs",
            "ordre": 10
          },
          {
            "code": "INFRA-II-02",
            "libelle": "Inspection des bacs",
            "ordre": 20
          },
          {
            "code": "INFRA-II-03",
            "libelle": "Entretien des bacs",
            "ordre": 30
          },
          {
            "code": "INFRA-II-04",
            "libelle": "Plan de redéploiement",
            "ordre": 40
          },
          {
            "code": "INFRA-II-05",
            "libelle": "Stratégie de gestion des bacs",
            "ordre": 50
          }
        ]
      },
      {
        "code": "INFRA-III",
        "libelle": "ROUTES",
        "ordre": 30,
        "enfants": [
          {
            "code": "INFRA-III-01",
            "libelle": "Autoroutes",
            "ordre": 10
          },
          {
            "code": "INFRA-III-02",
            "libelle": "Routes nationales",
            "ordre": 20
          },
          {
            "code": "INFRA-III-03",
            "libelle": "Routes régionales",
            "ordre": 30
          },
          {
            "code": "INFRA-III-04",
            "libelle": "Routes départementales",
            "ordre": 40
          },
          {
            "code": "INFRA-III-05",
            "libelle": "Routes communautaires",
            "ordre": 50
          },
          {
            "code": "INFRA-III-06",
            "libelle": "Pistes rurales",
            "ordre": 60
          },
          {
            "code": "INFRA-III-07",
            "libelle": "Voirie urbaine",
            "ordre": 70
          },
          {
            "code": "INFRA-III-08",
            "libelle": "Voirie urbaine de grande circulation",
            "ordre": 80
          }
        ]
      }
    ]
  },
  {
    "code": "O",
    "libelle": "GENERALITES",
    "ordre": 80
  },
  {
    "code": "PM",
    "libelle": "PASSATION DES MARCHES",
    "ordre": 90,
    "enfants": [
      {
        "code": "PM-I",
        "libelle": "MARCHES TRAVAUX",
        "ordre": 10,
        "enfants": [
          {
            "code": "PM-I-01",
            "libelle": "AO",
            "ordre": 10
          },
          {
            "code": "PM-I-02",
            "libelle": "DRP",
            "ordre": 20
          },
          {
            "code": "PM-I-03",
            "libelle": "ED",
            "ordre": 30
          },
          {
            "code": "PM-I-04",
            "libelle": "DC",
            "ordre": 40
          }
        ]
      },
      {
        "code": "PM-II",
        "libelle": "MARCHES FOURNITURE ET SERVICE",
        "ordre": 20,
        "enfants": [
          {
            "code": "PM-II-01",
            "libelle": "AO",
            "ordre": 10
          },
          {
            "code": "PM-II-02",
            "libelle": "DRP",
            "ordre": 20
          },
          {
            "code": "PM-II-03",
            "libelle": "ED",
            "ordre": 30
          },
          {
            "code": "PM-II-04",
            "libelle": "DC",
            "ordre": 40
          }
        ]
      },
      {
        "code": "PM-III",
        "libelle": "MARCHE PRESTATION INTELLECTUELLE",
        "ordre": 30,
        "enfants": [
          {
            "code": "PM-III-01",
            "libelle": "AMI",
            "ordre": 10
          },
          {
            "code": "PM-III-02",
            "libelle": "AO Restreint",
            "ordre": 20
          },
          {
            "code": "PM-III-03",
            "libelle": "DRP",
            "ordre": 30
          },
          {
            "code": "PM-III-04",
            "libelle": "ED",
            "ordre": 40
          },
          {
            "code": "PM-III-05",
            "libelle": "DC",
            "ordre": 50
          }
        ]
      },
      {
        "code": "PM-IV",
        "libelle": "SUIVI – EVALUATION",
        "ordre": 40
      }
    ]
  },
  {
    "code": "Q",
    "libelle": "QUALITE/REGLEMENTATION/NORMALISATION",
    "ordre": 100,
    "enfants": [
      {
        "code": "Q-I",
        "libelle": "REGLEMENTATION",
        "ordre": 10,
        "enfants": [
          {
            "code": "Q-I-01",
            "libelle": "Code de la voirie",
            "ordre": 10
          },
          {
            "code": "Q-I-02",
            "libelle": "Guide de valorisation des matériaux innovants",
            "ordre": 20
          },
          {
            "code": "Q-I-03",
            "libelle": "Etudes sur les matériaux dans la construction routière",
            "ordre": 30
          },
          {
            "code": "Q-I-04",
            "libelle": "Série prix travaux routiers",
            "ordre": 40
          }
        ]
      },
      {
        "code": "Q-II",
        "libelle": "NORMES CONSTRUCTION ROUTIERE",
        "ordre": 20
      },
      {
        "code": "Q-III",
        "libelle": "SECURITE ROUTIERE",
        "ordre": 30,
        "enfants": [
          {
            "code": "Q-III-01",
            "libelle": "Audit des infrastructures routières",
            "ordre": 10
          },
          {
            "code": "Q-III-02",
            "libelle": "Inspection des équipements de signalisation",
            "ordre": 20
          },
          {
            "code": "Q-III-03",
            "libelle": "Sensibilisation des acteurs de la route",
            "ordre": 30
          }
        ]
      },
      {
        "code": "Q-IV",
        "libelle": "CHARGE A L’ESSIEU",
        "ordre": 40,
        "enfants": [
          {
            "code": "Q-IV-01",
            "libelle": "Contrôle de la charge à l’essieu",
            "ordre": 10
          },
          {
            "code": "Q-IV-02",
            "libelle": "Normes communautaires",
            "ordre": 20
          },
          {
            "code": "Q-IV-03",
            "libelle": "Normes européennes",
            "ordre": 30
          }
        ]
      },
      {
        "code": "Q-V",
        "libelle": "QUALITE",
        "ordre": 50,
        "enfants": [
          {
            "code": "Q-V-01",
            "libelle": "Plan Assurance Qualité",
            "ordre": 10
          },
          {
            "code": "Q-V-02",
            "libelle": "Système Management Qualité de la Direction des Routes",
            "ordre": 20
          }
        ]
      },
      {
        "code": "Q-VI",
        "libelle": "ENVIRONNEMENT ET DEVELOPPEMENT DURABLE",
        "ordre": 60,
        "enfants": [
          {
            "code": "Q-VI-01",
            "libelle": "Evaluation Environnementale",
            "ordre": 10
          },
          {
            "code": "Q-VI-02",
            "libelle": "RSE",
            "ordre": 20
          },
          {
            "code": "Q-VI-03",
            "libelle": "Changement climatique",
            "ordre": 30
          },
          {
            "code": "Q-VI-04",
            "libelle": "Développement durable",
            "ordre": 40
          }
        ]
      }
    ]
  },
  {
    "code": "RH",
    "libelle": "RESSOURCES HUMAINES",
    "ordre": 110,
    "enfants": [
      {
        "code": "RH-I",
        "libelle": "RECRUTEMENT",
        "ordre": 10,
        "enfants": [
          {
            "code": "RH-I-01",
            "libelle": "Recrutement",
            "ordre": 10
          },
          {
            "code": "RH-I-02",
            "libelle": "Gestion prévisionnelle des emplois et des compétences (GPEC)",
            "ordre": 20
          },
          {
            "code": "RH-I-03",
            "libelle": "Rotation de l’emploi (Turn-over)",
            "ordre": 30
          }
        ]
      },
      {
        "code": "RH-II",
        "libelle": "DOSSIERS DE PERSONNEL",
        "ordre": 20
      },
      {
        "code": "RH-III",
        "libelle": "ACCIDENT DE TRAVAIL",
        "ordre": 30
      },
      {
        "code": "RH-IV",
        "libelle": "EVALUATION",
        "ordre": 40,
        "enfants": [
          {
            "code": "RH-IV-01",
            "libelle": "Avancement automatique/Reclassement",
            "ordre": 10
          },
          {
            "code": "RH-IV-02",
            "libelle": "Evaluation du personnel",
            "ordre": 20
          }
        ]
      },
      {
        "code": "RH-V",
        "libelle": "RETRAITE",
        "ordre": 50,
        "enfants": [
          {
            "code": "RH-V-01",
            "libelle": "Gestion prévisionnelle des retraites",
            "ordre": 10
          },
          {
            "code": "RH-V-02",
            "libelle": "Organisation des départs à la retraite",
            "ordre": 20
          }
        ]
      },
      {
        "code": "RH-VI",
        "libelle": "FORMATION",
        "ordre": 60,
        "enfants": [
          {
            "code": "RH-VI-01",
            "libelle": "Besoins en formation",
            "ordre": 10
          },
          {
            "code": "RH-VI-02",
            "libelle": "Plan de formation",
            "ordre": 20
          },
          {
            "code": "RH-VI-03",
            "libelle": "Evaluation formation",
            "ordre": 30
          }
        ]
      },
      {
        "code": "RH-VII",
        "libelle": "DOCUMENTS SYNDICAUX",
        "ordre": 70
      }
    ]
  },
  {
    "code": "S",
    "libelle": "STRUCTURES",
    "ordre": 120,
    "enfants": [
      {
        "code": "S-I",
        "libelle": "STRUCTURES SOUS-TUTELLE/MITTD",
        "ordre": 10,
        "enfants": [
          {
            "code": "S-I-01",
            "libelle": "CM",
            "ordre": 10
          },
          {
            "code": "S-I-02",
            "libelle": "SG",
            "ordre": 20
          },
          {
            "code": "S-I-03",
            "libelle": "DAGE",
            "ordre": 30
          },
          {
            "code": "S-I-04",
            "libelle": "FERA",
            "ordre": 40
          },
          {
            "code": "S-I-05",
            "libelle": "AGEROUTE",
            "ordre": 50
          },
          {
            "code": "S-I-06",
            "libelle": "CETUD",
            "ordre": 60
          },
          {
            "code": "S-I-07",
            "libelle": "CEREEQ",
            "ordre": 70
          },
          {
            "code": "S-I-08",
            "libelle": "DTR",
            "ordre": 80
          },
          {
            "code": "S-I-09",
            "libelle": "DSD",
            "ordre": 90
          },
          {
            "code": "S-I-10",
            "libelle": "DDD",
            "ordre": 100
          },
          {
            "code": "S-I-11",
            "libelle": "CFPTP",
            "ordre": 110
          },
          {
            "code": "S-I-12",
            "libelle": "CFPMR",
            "ordre": 120
          },
          {
            "code": "S-I-13",
            "libelle": "SGRF",
            "ordre": 130
          },
          {
            "code": "S-I-14",
            "libelle": "ANCF",
            "ordre": 140
          },
          {
            "code": "S-I-15",
            "libelle": "SENTER",
            "ordre": 150
          },
          {
            "code": "S-I-16",
            "libelle": "CCTVA",
            "ordre": 160
          }
        ]
      },
      {
        "code": "S-II",
        "libelle": "STRUCTURES/PROGRAMMES",
        "ordre": 20,
        "enfants": [
          {
            "code": "S-II-01",
            "libelle": "PUDC",
            "ordre": 10
          },
          {
            "code": "S-II-02",
            "libelle": "PUMA",
            "ordre": 20
          },
          {
            "code": "S-II-03",
            "libelle": "PNDL",
            "ordre": 30
          },
          {
            "code": "S-II-04",
            "libelle": "PPDC",
            "ordre": 40
          },
          {
            "code": "S-II-05",
            "libelle": "PROMOVILLES",
            "ordre": 50
          },
          {
            "code": "S-II-06",
            "libelle": "PATMUR",
            "ordre": 60
          },
          {
            "code": "S-II-07",
            "libelle": "MCA",
            "ordre": 70
          },
          {
            "code": "S-II-08",
            "libelle": "SSATP",
            "ordre": 80
          },
          {
            "code": "S-II-09",
            "libelle": "Autres Programmes",
            "ordre": 90
          }
        ]
      },
      {
        "code": "S-III",
        "libelle": "AUTRES STRUCTURES DE L’ETAT",
        "ordre": 30,
        "enfants": [
          {
            "code": "S-III-01",
            "libelle": "Primature",
            "ordre": 10
          },
          {
            "code": "S-III-02",
            "libelle": "AFRIQUE PESAGE",
            "ordre": 20
          },
          {
            "code": "S-III-03",
            "libelle": "APIX",
            "ordre": 30
          },
          {
            "code": "S-III-04",
            "libelle": "ANAT",
            "ordre": 40
          },
          {
            "code": "S-III-05",
            "libelle": "ANAM",
            "ordre": 50
          },
          {
            "code": "S-III-06",
            "libelle": "AGETIP",
            "ordre": 60
          },
          {
            "code": "S-III-07",
            "libelle": "PAD",
            "ordre": 70
          },
          {
            "code": "S-III-08",
            "libelle": "CCIAD",
            "ordre": 80
          },
          {
            "code": "S-III-09",
            "libelle": "ANSD",
            "ordre": 90
          },
          {
            "code": "S-III-10",
            "libelle": "ARMP",
            "ordre": 100
          },
          {
            "code": "S-III-11",
            "libelle": "DCMP",
            "ordre": 110
          },
          {
            "code": "S-III-12",
            "libelle": "DEEC",
            "ordre": 120
          },
          {
            "code": "S-III-13",
            "libelle": "DGPU",
            "ordre": 130
          },
          {
            "code": "S-III-14",
            "libelle": "DUA",
            "ordre": 140
          },
          {
            "code": "S-III-15",
            "libelle": "COSEC",
            "ordre": 150
          },
          {
            "code": "S-III-16",
            "libelle": "EMASE",
            "ordre": 160
          },
          {
            "code": "S-III-17",
            "libelle": "SOGIP",
            "ordre": 170
          },
          {
            "code": "S-III-18",
            "libelle": "SAED",
            "ordre": 180
          },
          {
            "code": "S-III-19",
            "libelle": "BOS-PSE",
            "ordre": 190
          },
          {
            "code": "S-III-20",
            "libelle": "OMVS",
            "ordre": 200
          },
          {
            "code": "S-III-21",
            "libelle": "Autres",
            "ordre": 210
          }
        ]
      },
      {
        "code": "S-IV",
        "libelle": "PARTENAIRES TECHNIQUE ET FINANCIER",
        "ordre": 40,
        "enfants": [
          {
            "code": "S-IV-01",
            "libelle": "UEMOA",
            "ordre": 10
          },
          {
            "code": "S-IV-02",
            "libelle": "CEDEAO",
            "ordre": 20
          },
          {
            "code": "S-IV-03",
            "libelle": "UA",
            "ordre": 30
          },
          {
            "code": "S-IV-04",
            "libelle": "BAD",
            "ordre": 40
          },
          {
            "code": "S-IV-05",
            "libelle": "BOAD",
            "ordre": 50
          },
          {
            "code": "S-IV-06",
            "libelle": "BANQUE MONDIALE",
            "ordre": 60
          },
          {
            "code": "S-IV-07",
            "libelle": "UE",
            "ordre": 70
          },
          {
            "code": "S-IV-08",
            "libelle": "AIPCR",
            "ordre": 80
          },
          {
            "code": "S-IV-09",
            "libelle": "AGEPAR",
            "ordre": 90
          },
          {
            "code": "S-IV-10",
            "libelle": "Autres PTF",
            "ordre": 100
          }
        ]
      }
    ]
  },
  {
    "code": "T",
    "libelle": "TRAVAUX",
    "ordre": 130,
    "enfants": [
      {
        "code": "T-I",
        "libelle": "Réhabilitation/Construction de bâtiment",
        "ordre": 10
      },
      {
        "code": "T-II",
        "libelle": "Réhabilitation/Construction de débarcadères",
        "ordre": 20
      },
      {
        "code": "T-III",
        "libelle": "Réhabilitation/Construction poste de pesage",
        "ordre": 30
      }
    ]
  }
];
