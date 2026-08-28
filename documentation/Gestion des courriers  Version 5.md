\# Gestion des courriers — Version 5



Tu dois poursuivre l'évolution du module \*\*Gestion des courriers du SIM\*\*.



Cette version concerne principalement l'amélioration de l'interface de traitement des \*\*courriers de départ\*\* et surtout des \*\*courriers arrivés\*\*, avec une nouvelle gestion des actions de workflow : \*\*Affectation, Imputation, Transmission et Redirection\*\*.



Avant toute modification, analyse impérativement l'implémentation actuelle afin de réutiliser les composants existants et d'éviter toute régression.



\---



\# 1. ANALYSE PRÉALABLE OBLIGATOIRE



Avant de modifier le code :



1\. Analyse la page actuelle de traitement des courriers de départ.

2\. Analyse la page actuelle de traitement des courriers arrivés.

3\. Analyse le moteur de workflow.

4\. Analyse la gestion actuelle des actions de workflow.

5\. Analyse la gestion actuelle de l'imputation.

6\. Analyse la gestion des affectations et transmissions, si elles existent.

7\. Analyse la structure des étapes du workflow.

8\. Analyse la section actuelle « Imputation ».

9\. Analyse l'affichage de la description des étapes.

10\. Analyse la page :

&#x20;   \*\*Administration → Paramètres → Liste des valeurs\*\*

11\. Analyse le fichier/image :

&#x20;   \*\*`imputation.png`\*\*

12\. Vérifie si des composants ou modales existants peuvent être réutilisés.



\*\*Ne modifie pas immédiatement le code.\*\*



Commence par présenter :



\* l'état actuel ;

\* les composants concernés ;

\* les fonctionnalités existantes ;

\* les écarts avec les exigences ci-dessous ;

\* les tables/API/services concernés ;

\* les modifications nécessaires ;

\* les risques de régression ;

\* le plan d'implémentation.



Attends ma validation avant de commencer l'implémentation.



\---



\# 2. PAGE DE TRAITEMENT — COURRIERS DE DÉPART



Sur la page de traitement des \*\*courriers de départ\*\*, supprimer la section :



> \*\*Historique et audit\*\*



Cette section ne doit plus être affichée sur cette page.



\### Important



La suppression concerne uniquement \*\*l'affichage sur la page de traitement\*\*.



Ne supprime pas le mécanisme d'audit ou de journalisation du système s'il est utilisé ailleurs.



Les données d'audit doivent continuer à être conservées conformément aux règles de sécurité existantes.



\---



\# 3. PAGE DE TRAITEMENT — COURRIERS ARRIVÉS



La page de traitement des courriers arrivés doit être revue afin de rendre les actions du workflow plus intuitives.



Les actions concernées sont notamment :



\* \*\*Affectation\*\*

\* \*\*Imputation\*\*

\* \*\*Transmission\*\*

\* \*\*Redirection\*\*



Lorsqu'un utilisateur clique sur l'une de ces actions, il ne faut pas exécuter directement l'action.



Le système doit ouvrir une \*\*fenêtre modale / popup dédiée\*\*, permettant à l'utilisateur de renseigner les informations nécessaires avant validation.



L'interface doit s'inspirer du fichier :



> \*\*`imputation.png`\*\*



Analyse précisément cette image avant de concevoir l'interface.



\---



\# 4. ACTION « IMPUTATION »



Lorsqu'un utilisateur clique sur :



> \*\*Imputation\*\*



ouvrir une fenêtre modale dédiée.



La fenêtre doit comporter plusieurs zones.



\## 4.1 Entité concernée



Ajouter un champ permettant de sélectionner :



> \*\*Entité concernée\*\*



Il s'agit d'un choix principal.



Le composant doit être un combo/liste permettant de sélectionner une entité autorisée pour l'utilisateur.



La liste des entités disponibles doit respecter les règles de responsabilité définies par l'organigramme et les droits de l'utilisateur.



Un utilisateur ne doit pas pouvoir imputer à une entité située en dehors de son périmètre de responsabilité.



\---



\# 5. ENTITÉS EN COPIE



Dans la même fenêtre, ajouter une zone permettant de sélectionner plusieurs entités en copie.



Exemple :



```text

Entité concernée

\[ Direction de l'Informatique ]



Entités en copie

☐ Direction Administrative

☐ Direction Financière

☐ Direction Juridique

☐ Direction des Ressources Humaines

```



Le choix des entités en copie doit être \*\*multiple\*\*.



Les entités en copie doivent être clairement distinguées de l'entité principale.



\### Important



L'entité principale est responsable du traitement.



Les entités en copie reçoivent l'information mais ne deviennent pas automatiquement responsables du traitement, sauf si le workflow ou la configuration prévoit le contraire.



\---



\# 6. ACTIONS DEMANDÉES



Ajouter une section :



> \*\*Actions demandées\*\*



Cette section doit permettre de sélectionner une ou plusieurs actions.



Le système doit utiliser la liste des valeurs configurée dans :



> \*\*Administration → Paramètres → Liste des valeurs\*\*



La liste des actions demandées ne doit donc pas être codée en dur.



Le choix doit pouvoir être multiple.



Exemple :



```text

Actions demandées



☐ Pour information

☐ Pour avis

☐ Pour traitement

☐ Pour suivi

☐ Pour validation

```



Les valeurs exactes doivent être récupérées depuis la configuration existante et/ou le fichier de référence fourni.



\---



\# 7. DATE D'ÉCHÉANCE



Ajouter dans la fenêtre d'imputation un champ facultatif :



> \*\*Date d'échéance\*\*



Ce champ permet de définir une date limite de traitement.



Le champ est facultatif.



Si une date est définie :



\* elle doit être enregistrée ;

\* elle doit être visible dans le dossier du courrier ;

\* elle doit être associée à l'imputation/action ;

\* elle doit pouvoir être utilisée par le système de gestion des retards ;

\* elle doit permettre d'alimenter la bannette \*\*Courriers en retard\*\* lorsque le délai est dépassé.



Si aucune date n'est renseignée, aucune échéance ne doit être créée.



\---



\# 8. OBSERVATION



Ajouter un champ :



> \*\*Observation\*\*



Ce champ doit permettre à l'utilisateur de saisir une instruction ou une observation concernant l'imputation.



Exemple :



> « Préparer une note de synthèse avant la réunion du 20 août. »



L'observation doit être enregistrée avec l'action effectuée.



Elle doit être consultable ultérieurement dans le dossier du courrier et dans l'historique du workflow.



\---



\# 9. VALIDATION DE L'IMPUTATION



La fenêtre doit comporter une action claire :



> \*\*Valider l'imputation\*\*



Avant validation, vérifier :



\* qu'une entité principale est sélectionnée ;

\* que les entités en copie sont valides ;

\* que les actions demandées sont valides ;

\* que l'utilisateur dispose des droits nécessaires ;

\* que la date d'échéance est valide lorsqu'elle est renseignée.



Après validation :



1\. enregistrer l'imputation ;

2\. enregistrer les entités en copie ;

3\. enregistrer les actions demandées ;

4\. enregistrer l'échéance ;

5\. enregistrer l'observation ;

6\. enregistrer l'utilisateur ayant effectué l'action ;

7\. enregistrer la date et l'heure ;

8\. mettre à jour l'étape du workflow ;

9\. déclencher la transition vers l'étape suivante selon la configuration du workflow ;

10\. déclencher les notifications nécessaires.



\---



\# 10. TRANSMISSION ET REDIRECTION



Pour les actions :



> \*\*Transmission\*\*



et



> \*\*Redirection\*\*



ouvrir également une fenêtre modale.



La fenêtre doit permettre à l'utilisateur de choisir le ou les destinataires autorisés.



La sélection doit notamment permettre d'afficher :



\### A. Les entités de sa direction



Afficher les entités auxquelles l'utilisateur est autorisé à transmettre le courrier selon l'organigramme.



\### B. Les personnes de sa hiérarchie



Afficher également les personnes de la hiérarchie auxquelles l'utilisateur peut transmettre ou rediriger le courrier selon ses droits.



La liste doit être calculée dynamiquement.



Il ne faut pas afficher toutes les personnes de l'organisation.



\---



\# 11. DIFFÉRENCE ENTRE TRANSMISSION ET REDIRECTION



Le système doit conserver une distinction fonctionnelle entre :



\### Transmission



Le courrier est transmis à un autre destinataire tout en conservant la traçabilité du circuit initial.



\### Redirection



Le courrier est réorienté vers un autre destinataire ou une autre entité.



Avant implémentation, analyse le fonctionnement actuel et propose la distinction technique appropriée.



Ne crée pas deux mécanismes différents si le moteur de workflow existant permet déjà de gérer correctement cette distinction.



\---



\# 12. APRÈS VALIDATION D'UNE ACTION



Après validation de :



\* Affectation ;

\* Imputation ;

\* Transmission ;

\* Redirection ;



le courrier doit passer automatiquement à \*\*l'étape suivante du workflow\*\*, conformément à la configuration du workflow.



Le système ne doit pas utiliser une transition codée en dur.



Le moteur doit déterminer dynamiquement :



```text

Étape actuelle

&#x20;     ↓

Action effectuée

&#x20;     ↓

Règle de transition

&#x20;     ↓

Étape suivante

```



Exemple :



```text

Routage

&#x20;  ↓

Imputation

&#x20;  ↓

Traitement

```



ou :



```text

Routage

&#x20;  ↓

Transmission

&#x20;  ↓

Validation

```



selon la configuration du workflow.



\---



\# 13. SUPPRESSION DE LA SECTION « IMPUTATION »



Sur la page de traitement des courriers arrivés, supprimer la section actuelle :



> \*\*Imputation\*\*



Cette section ne doit plus être présentée comme un bloc statique indépendant.



Les opérations d'imputation doivent désormais être réalisées à travers les \*\*actions du workflow\*\*.



L'utilisateur clique sur :



> Imputation



puis la fenêtre modale permet de réaliser l'ensemble de l'opération.



\---



\# 14. AFFICHAGE DES ACTIONS EFFECTUÉES



Même si la section « Imputation » est supprimée, les informations relatives aux actions effectuées doivent rester visibles.



Le dossier du courrier doit permettre de visualiser les informations concernant :



\* les personnes imputées ;

\* les entités imputées ;

\* les personnes affectées ;

\* les entités affectées ;

\* les personnes auxquelles le courrier a été transmis ;

\* les entités auxquelles le courrier a été transmis ;

\* les personnes ou entités vers lesquelles le courrier a été redirigé ;

\* les observations ;

\* les actions demandées ;

\* les échéances ;

\* les dates ;

\* les utilisateurs ayant effectué les actions.



L'affichage doit être clair et chronologique.



\---



\# 15. DESCRIPTION DES ÉTAPES DU WORKFLOW



Dans la zone où sont actuellement affichées les différentes étapes du workflow, enrichir la description de chaque étape.



Pour chaque étape ayant fait l'objet d'une action, afficher également :



\* l'action effectuée ;

\* la personne concernée ;

\* l'entité concernée ;

\* les entités en copie ;

\* les actions demandées ;

\* l'observation ;

\* la date ;

\* l'échéance éventuelle ;

\* l'utilisateur ayant effectué l'action.



Exemple :



```text

IMPUTATION

────────────────────────────



Entité principale :

Direction de l'Informatique



En copie :

Direction Administrative

Direction Financière



Action demandée :

Pour traitement



Échéance :

20/08/2026



Observation :

Préparer une note de synthèse.



Effectué par :

Secrétaire DG



Date :

15/08/2026 10:32

```



L'objectif est d'obtenir une \*\*véritable timeline du traitement du courrier\*\*, permettant de comprendre immédiatement son parcours.



\---



\# 16. ADMINISTRATION — ACTIONS DEMANDÉES



Dans :



> \*\*Administration → Paramètres → Liste des valeurs\*\*



ajouter une nouvelle catégorie de valeurs :



> \*\*Actions demandées\*\*



Cette liste doit être paramétrable par l'administrateur.



Le contenu doit s'inspirer du fichier de référence fourni.



\### Important



Ne pas coder les actions demandées directement dans le frontend.



Elles doivent être récupérées dynamiquement depuis la configuration.



L'administrateur doit pouvoir :



\* ajouter une action ;

\* modifier une action ;

\* désactiver une action ;

\* éventuellement réordonner les actions selon les capacités du module existant.



\---



\# 17. MODÈLE DE DONNÉES



Avant d'ajouter de nouvelles tables, analyse le modèle existant.



Détermine comment stocker proprement :



\* entité principale ;

\* entités en copie ;

\* personnes destinataires ;

\* actions demandées ;

\* échéance ;

\* observation ;

\* type d'action ;

\* étape du workflow ;

\* utilisateur ayant effectué l'action ;

\* date/heure ;

\* historique.



L'objectif est d'avoir une structure générique permettant de gérer :



```text

Imputation

Affectation

Transmission

Redirection

```



sans multiplier inutilement les structures spécifiques.



\---



\# 18. SÉCURITÉ ET DROITS



Toutes les actions doivent respecter les droits de l'utilisateur.



Un utilisateur ne doit pouvoir sélectionner que :



\* les entités autorisées ;

\* les personnes autorisées ;

\* les services autorisés ;

\* les destinataires autorisés.



Les règles doivent être basées sur :



\* profil ;

\* rôle ;

\* entité de rattachement ;

\* responsabilité hiérarchique ;

\* organigramme ;

\* workflow.



Une simple modification de l'interface ne suffit pas.



Les contrôles doivent également être appliqués au niveau du backend/service/API.



\---



\# 19. AUDIT



Même si la section \*\*Historique et audit\*\* est supprimée de la page de traitement des courriers de départ, la journalisation des actions du workflow doit continuer à fonctionner.



Pour les courriers arrivés, conserver la traçabilité de :



\* l'imputation ;

\* l'affectation ;

\* la transmission ;

\* la redirection ;

\* les modifications ;

\* les validations ;

\* les changements d'étapes.



\---



\# 20. RÉUTILISATION DE L'EXISTANT



Avant de créer un nouveau composant, vérifier si le projet possède déjà :



\* une modal générique ;

\* un composant de sélection d'entités ;

\* un composant de sélection multiple ;

\* un composant de sélection d'utilisateurs ;

\* un composant de gestion des contacts ;

\* un composant de gestion des dates ;

\* un composant de timeline ;

\* un composant de workflow ;

\* un mécanisme de notification ;

\* un mécanisme d'audit.



Réutiliser les composants existants lorsqu'ils sont suffisamment génériques.



\---



\# 21. TESTS À PRÉVOIR



Prévoir au minimum les scénarios suivants :



\### Test 1 — Imputation simple



Sélectionner une entité principale et valider.



Vérifier :



\* l'enregistrement ;

\* la transition du workflow ;

\* la notification ;

\* l'affichage dans le dossier.



\### Test 2 — Imputation avec copies



Sélectionner :



\* une entité principale ;

\* plusieurs entités en copie.



Vérifier la visibilité et les droits.



\### Test 3 — Actions multiples



Sélectionner plusieurs actions demandées.



Vérifier leur enregistrement et leur affichage.



\### Test 4 — Échéance



Ajouter une date d'échéance.



Vérifier :



\* l'affichage ;

\* le calcul du retard ;

\* la bannette correspondante.



\### Test 5 — Observation



Ajouter une observation.



Vérifier qu'elle apparaît dans la timeline.



\### Test 6 — Transmission



Transmettre à une entité autorisée.



Vérifier la transition du workflow.



\### Test 7 — Redirection



Rediriger vers une personne ou entité autorisée.



Vérifier la traçabilité.



\### Test 8 — Sécurité



Essayer d'imputer à une entité hors périmètre.



Résultat attendu :



> Action refusée.



\### Test 9 — Actions demandées



Ajouter/modifier une valeur dans :



> Administration → Paramètres → Liste des valeurs



Vérifier qu'elle apparaît automatiquement dans la fenêtre d'imputation.



\---



\# 22. LIVRABLE AVANT IMPLÉMENTATION



Avant de modifier le code, présente-moi obligatoirement :



\### A. Analyse de l'existant



\### B. Analyse du fichier `imputation.png`



\### C. Composants à réutiliser



\### D. Fichiers à modifier



\### E. Tables/API/services concernés



\### F. Architecture proposée



\### G. Modèle de données



\### H. Gestion des droits



\### I. Gestion des transitions du workflow



\### J. Plan d'implémentation



\### K. Plan de tests



\### L. Risques de régression



\*\*Ne commence pas le développement avant ma validation de cette analyse.\*\*



L'objectif de cette version est de transformer les actions de traitement des courriers arrivés en un véritable mécanisme intégré au moteur de workflow, tout en conservant une traçabilité complète et une interface simple pour l'utilisateur.



