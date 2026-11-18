# SIM-DGIRD — sécurisation du serveur, lot 1 de l'audit (v8.6.5)
# À lancer UNE fois, en administrateur :
#   powershell -ExecutionPolicy Bypass -File C:\recette-v8-6-5\outils\serveur\securiser-lot1.ps1
# Ce script :
#  1. ferme le port 3001 de l'API aux autres postes (IIS continue de l'utiliser en local) ;
#  2. ajoute NODE_ENV=production dans .env s'il manque (arrêt du journal SQL complet) ;
#  3. réserve la lecture du fichier .env aux administrateurs et au système ;
#  4. installe la sauvegarde quotidienne (base + fichiers) à 01:30, conservée 30 jours.
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$resultats = @()

# 1. Pare-feu
if (-not (Get-NetFirewallRule -DisplayName 'SIM-DGIRD API locale uniquement' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'SIM-DGIRD API locale uniquement' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Block | Out-Null
}
$resultats += 'Pare-feu : port 3001 fermé aux autres postes'

# 2. NODE_ENV
$envFichier = Join-Path $app '.env'
if (-not (Select-String -Path $envFichier -Pattern '^NODE_ENV=' -Quiet)) {
  Add-Content -Path $envFichier -Value "`r`nNODE_ENV=production"
  $resultats += 'NODE_ENV=production ajouté'
} else { $resultats += 'NODE_ENV déjà présent : ' + ((Select-String -Path $envFichier -Pattern '^NODE_ENV=').Line) }

# 3. Droits sur .env (seulement si le service tourne sous le compte Système)
$compteService = (Get-CimInstance Win32_Service -Filter "Name='SimDgirdApi'").StartName
if ($compteService -eq 'LocalSystem') {
  icacls $envFichier /inheritance:r /grant:r '*S-1-5-32-544:(F)' '*S-1-5-18:(F)' | Out-Null
  $resultats += '.env : lecture réservée aux administrateurs et au système'
} else {
  $resultats += ".env : droits NON modifiés (service sous le compte $compteService) — à faire manuellement"
}

# 4. Sauvegarde quotidienne
New-Item -ItemType Directory -Force -Path (Join-Path $app 'outils') | Out-Null
Copy-Item (Join-Path $source 'sauvegarde-quotidienne.ps1') (Join-Path $app 'outils\sauvegarde-quotidienne.ps1') -Force
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$app\outils\sauvegarde-quotidienne.ps1`""
$declencheur = New-ScheduledTaskTrigger -Daily -At '01:30'
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName 'SIM-DGIRD sauvegarde quotidienne' -Action $action -Trigger $declencheur -Principal $principal -Force | Out-Null
Start-ScheduledTask -TaskName 'SIM-DGIRD sauvegarde quotidienne'
$resultats += 'Sauvegarde quotidienne installée (01:30) et lancée une première fois'

Restart-Service SimDgirdApi
Start-Sleep 8
$resultats += 'Service : ' + (Get-Service SimDgirdApi).Status
$resultats | ForEach-Object { Write-Output $_ }
