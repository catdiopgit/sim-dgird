# Agent de numérisation SIM-DGIRD

Permet le bouton **Scanner** de l'assistant « Nouveau courrier arrivé » (document
principal et pièces jointes). Un navigateur ne peut pas piloter un scanner :
cet agent tourne sur le poste et fait l'intermédiaire.

## Installation (une fois par poste : Bureau Courrier, Assistante DG)

1. Installer le pilote du scanner (TWAIN ou WIA) fourni par le fabricant.
2. Installer **NAPS2** (gratuit) : https://www.naps2.com
3. Dans NAPS2, créer un profil nommé **SIM** : choisir le scanner, 200–300 dpi,
   niveaux de gris, chargeur ou vitre, recto-verso si besoin.
4. Copier ce dossier sur le poste (par ex. `C:\SIM\agent-scan`), adapter
   `config.json` si besoin (adresse du SIM dans `originesAutorisees`).
5. Clic droit sur `installer.ps1` → *Exécuter avec PowerShell* (en administrateur).

## Changer de scanner

Aucun changement de code : installer le pilote du nouveau scanner, puis dans
NAPS2 modifier le profil **SIM** (bouton *Changer de périphérique*).

## Dépannage

- Journal : `agent-scan.log` dans le dossier de l'agent.
- Test : ouvrir http://localhost:7777/status dans le navigateur du poste.
- Chrome peut demander l'autorisation d'accéder aux appareils du réseau local
  la première fois : répondre **Autoriser**.
