// Plan de classement de la DGIRD, version 6 (document « PLAN DE CLASSEMENT
// DE LA DGIRD », novembre 2026) : 10 séries, 31 sous-séries, 182 rubriques.
// Codes : série (A, PM…) → sous-série en chiffres romains (A-I) → rubrique
// sur deux chiffres (A-I-01). Les rubriques sans subdivision du document
// (O Généralités, E-II, INFRA-IV, RH-II, RH-III, RH-VII) sont conservées.
// Modifiable ensuite par l'archiviste tant qu'aucun document n'y est classé.
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
          }
        ]
      },
      {
        "code": "A-II",
        "libelle": "TEXTES REGLEMENTAIRES",
        "ordre": 20,
        "enfants": [
          {
            "code": "A-II-01",
            "libelle": "Arrêtés",
            "ordre": 10
          },
          {
            "code": "A-II-02",
            "libelle": "Décrets",
            "ordre": 20
          },
          {
            "code": "A-II-03",
            "libelle": "Lois",
            "ordre": 30
          },
          {
            "code": "A-II-04",
            "libelle": "Circulaire",
            "ordre": 40
          },
          {
            "code": "A-II-05",
            "libelle": "Note de service",
            "ordre": 50
          },
          {
            "code": "A-II-06",
            "libelle": "Règlement",
            "ordre": 60
          },
          {
            "code": "A-II-07",
            "libelle": "Décision",
            "ordre": 70
          },
          {
            "code": "A-II-08",
            "libelle": "Directive",
            "ordre": 80
          },
          {
            "code": "A-II-09",
            "libelle": "Norme",
            "ordre": 90
          },
          {
            "code": "A-II-10",
            "libelle": "Code",
            "ordre": 100
          }
        ]
      }
    ]
  },
  {
    "code": "B",
    "libelle": "BUDGET",
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
            "libelle": "Gestion stock (fournitures de bureau et consommables)",
            "ordre": 10
          },
          {
            "code": "C-I-02",
            "libelle": "Gestion du Carburant",
            "ordre": 20
          },
          {
            "code": "C-I-03",
            "libelle": "Gestion Ordre de mission & Déplacement",
            "ordre": 30
          },
          {
            "code": "C-I-04",
            "libelle": "Colloques/séminaires/conférences",
            "ordre": 40
          },
          {
            "code": "C-I-05",
            "libelle": "Gestion frais médicaux",
            "ordre": 50
          },
          {
            "code": "C-I-06",
            "libelle": "Etat des salaires et charges",
            "ordre": 60
          },
          {
            "code": "C-I-07",
            "libelle": "Situation des créances DTP",
            "ordre": 70
          },
          {
            "code": "C-I-08",
            "libelle": "Annonces/Insertion publicitaire",
            "ordre": 80
          },
          {
            "code": "C-I-09",
            "libelle": "Gestion parc automobile",
            "ordre": 90
          },
          {
            "code": "C-I-10",
            "libelle": "Renforcement de capacité",
            "ordre": 100
          },
          {
            "code": "C-I-11",
            "libelle": "Entretien et réparation de maintenance informatiques",
            "ordre": 110
          },
          {
            "code": "C-I-12",
            "libelle": "Vente de DAO",
            "ordre": 120
          },
          {
            "code": "C-I-13",
            "libelle": "Cotisations des organismes",
            "ordre": 130
          },
          {
            "code": "C-I-14",
            "libelle": "Autres charges diverses",
            "ordre": 140
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
            "libelle": "Conseil Présidentiel",
            "ordre": 30
          }
        ]
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
        "libelle": "BCDR ET SIR",
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
          }
        ]
      }
    ]
  },
  {
    "code": "INFRA",
    "libelle": "INFRASTRUCTURES",
    "ordre": 60,
    "enfants": [
      {
        "code": "INFRA-I",
        "libelle": "PONTS",
        "ordre": 10,
        "enfants": [
          {
            "code": "INFRA-I-01",
            "libelle": "Inspection des ponts et ouvrages d’art",
            "ordre": 10
          },
          {
            "code": "INFRA-I-02",
            "libelle": "Suivi travaux de ponts et OA",
            "ordre": 20
          }
        ]
      },
      {
        "code": "INFRA-II",
        "libelle": "BACS ET DEBARCADERES",
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
          },
          {
            "code": "INFRA-II-06",
            "libelle": "Construction et entretien des débarcadères",
            "ordre": 60
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
            "libelle": "Inspection des routes et autoroutes",
            "ordre": 10
          },
          {
            "code": "INFRA-III-02",
            "libelle": "Suivi des projets routiers et autoroutiers",
            "ordre": 20
          }
        ]
      },
      {
        "code": "INFRA-IV",
        "libelle": "BATIMENTS",
        "ordre": 40
      },
      {
        "code": "INFRA-V",
        "libelle": "SECURITE ROUTIERE",
        "ordre": 50,
        "enfants": [
          {
            "code": "INFRA-V-01",
            "libelle": "Audit des infrastructures routières",
            "ordre": 10
          },
          {
            "code": "INFRA-V-02",
            "libelle": "Inspection des équipements de signalisation",
            "ordre": 20
          },
          {
            "code": "INFRA-V-03",
            "libelle": "Sensibilisation des acteurs de la route",
            "ordre": 30
          }
        ]
      },
      {
        "code": "INFRA-VI",
        "libelle": "CHARGE A L’ESSIEU",
        "ordre": 60,
        "enfants": [
          {
            "code": "INFRA-VI-01",
            "libelle": "Rapport statistiques pesages",
            "ordre": 10
          },
          {
            "code": "INFRA-VI-02",
            "libelle": "Rapport statistique délestages",
            "ordre": 20
          },
          {
            "code": "INFRA-VI-03",
            "libelle": "Exécution contrat de suivi de la charge à l’essieu",
            "ordre": 30
          }
        ]
      },
      {
        "code": "INFRA-VII",
        "libelle": "QUALITE",
        "ordre": 70,
        "enfants": [
          {
            "code": "INFRA-VII-01",
            "libelle": "Plan Assurance Qualité",
            "ordre": 10
          },
          {
            "code": "INFRA-VII-02",
            "libelle": "Système Management Qualité de la Direction des Routes",
            "ordre": 20
          }
        ]
      },
      {
        "code": "INFRA-VIII",
        "libelle": "ENVIRONNEMENT ET DEVELOPPEMENT DURABLE",
        "ordre": 80,
        "enfants": [
          {
            "code": "INFRA-VIII-01",
            "libelle": "CDN",
            "ordre": 10
          },
          {
            "code": "INFRA-VIII-02",
            "libelle": "COP",
            "ordre": 20
          },
          {
            "code": "INFRA-VIII-03",
            "libelle": "Etudes environnementales réalisées par d’autres structures",
            "ordre": 30
          }
        ]
      }
    ]
  },
  {
    "code": "O",
    "libelle": "GENERALITES",
    "ordre": 70
  },
  {
    "code": "PM",
    "libelle": "PASSATION DES MARCHES",
    "ordre": 80,
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
        "ordre": 40,
        "enfants": [
          {
            "code": "PM-IV-01",
            "libelle": "PPM",
            "ordre": 10
          },
          {
            "code": "PM-IV-02",
            "libelle": "Rapport d’activités DGIRD",
            "ordre": 20
          }
        ]
      }
    ]
  },
  {
    "code": "RH",
    "libelle": "RESSOURCES HUMAINES",
    "ordre": 90,
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
            "libelle": "Passation de service",
            "ordre": 20
          },
          {
            "code": "RH-I-03",
            "libelle": "Gestion prévisionnelle des emplois et des compétences (GPEC)",
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
            "libelle": "Plan de formation",
            "ordre": 10
          },
          {
            "code": "RH-VI-02",
            "libelle": "Evaluation formation",
            "ordre": 20
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
    "ordre": 100,
    "enfants": [
      {
        "code": "S-I",
        "libelle": "STRUCTURES SOUS-TUTELLE/MITTD",
        "ordre": 10,
        "enfants": [
          {
            "code": "S-I-01",
            "libelle": "Cabinet Ministre",
            "ordre": 10
          },
          {
            "code": "S-I-02",
            "libelle": "SG Ministre",
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
            "libelle": "LNR – BTP (CEREEQ)",
            "ordre": 70
          },
          {
            "code": "S-I-08",
            "libelle": "DGTT",
            "ordre": 80
          },
          {
            "code": "S-I-09",
            "libelle": "ADS",
            "ordre": 90
          },
          {
            "code": "S-I-10",
            "libelle": "ANASER",
            "ordre": 100
          },
          {
            "code": "S-I-11",
            "libelle": "DDD",
            "ordre": 110
          },
          {
            "code": "S-I-12",
            "libelle": "CFPTP",
            "ordre": 120
          },
          {
            "code": "S-I-13",
            "libelle": "CFPMR",
            "ordre": 130
          },
          {
            "code": "S-I-14",
            "libelle": "SERF",
            "ordre": 140
          },
          {
            "code": "S-I-15",
            "libelle": "ANCF",
            "ordre": 150
          },
          {
            "code": "S-I-16",
            "libelle": "CFS",
            "ordre": 160
          },
          {
            "code": "S-I-17",
            "libelle": "GTS",
            "ordre": 170
          },
          {
            "code": "S-I-18",
            "libelle": "SENTER",
            "ordre": 180
          },
          {
            "code": "S-I-19",
            "libelle": "CCTVA",
            "ordre": 190
          },
          {
            "code": "S-I-20",
            "libelle": "FDTT",
            "ordre": 200
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
            "libelle": "Autres Programmes",
            "ordre": 80
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
            "libelle": "AIPCR/PIARC",
            "ordre": 80
          },
          {
            "code": "S-IV-09",
            "libelle": "AGEPAR",
            "ordre": 90
          },
          {
            "code": "S-IV-10",
            "libelle": "SSATP",
            "ordre": 100
          },
          {
            "code": "S-IV-11",
            "libelle": "Autres PTF",
            "ordre": 110
          }
        ]
      }
    ]
  }
];
