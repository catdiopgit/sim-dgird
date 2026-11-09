Logo de la page de connexion
=============================

Le logo affiché sur la page de connexion est chargé directement depuis ce
dossier (public/), pas depuis la base de données. Fichier actuel :
public/logo-organisation.png. Pour le remplacer :

1. Même format (PNG) : remplacez simplement le fichier
   public/logo-organisation.png par votre nouveau logo, en gardant
   exactement ce nom de fichier. Aucune modification de code, aucun
   redémarrage de l'application n'est nécessaire.

2. Autre format (SVG, JPG...) : déposez votre fichier dans ce dossier
   (ex. public/logo-organisation.svg), puis modifiez une seule ligne dans
   src/pages/LoginPage.tsx : la valeur `LOGO_LOGIN = '/logo-organisation.png'` de
   la balise <img> du logo, pour qu'elle pointe vers votre nouveau fichier
   (ex. "/logo-organisation.svg").

Ce logo n'est utilisé que sur la page de connexion. Le logo affiché dans
le reste de l'application (après connexion, documents imprimés) reste
configuré depuis Administration > Organisation, indépendamment de ce
fichier.
