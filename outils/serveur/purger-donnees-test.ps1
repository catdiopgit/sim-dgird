# SIM-DGIRD — purge des données de test (courriers, projets, GED) avant la mise en production
#
#   Simulation (ne supprime rien, affiche ce qui serait supprimé) :
#     powershell -ExecutionPolicy Bypass -File .\purger-donnees-test.ps1 -Simulation
#   Purge réelle :
#     powershell -ExecutionPolicy Bypass -File .\purger-donnees-test.ps1
#   Purge réelle + carnet d'adresses des courriers (contacts) :
#     powershell -ExecutionPolicy Bypass -File .\purger-donnees-test.ps1 -AvecContacts
#
# Étapes : 1. arrêt de l'API ; 2. sauvegarde complète de la base ; 3. suppression en UNE
# transaction (tout ou rien) ; 4. fichiers des courriers et de la GED déplacés dans le
# dossier de sauvegarde (pas effacés) ; 5. redémarrage de l'API.
# Conservés : utilisateurs, rôles, entités, paramétrage, circuits, plan de classement,
# marchés, journal d'audit. Numérotation des courriers et des projets remise à zéro.
param([switch]$Simulation, [switch]$AvecContacts)
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
$service = 'SimDgirdApi'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$sql = Join-Path $source 'purger-donnees-test.sql'
if (-not (Test-Path $sql)) { throw "Fichier introuvable : $sql" }

function Lire-Env($cle) {
  $l = Get-Content "$app\.env" | Where-Object { $_ -match "^$cle=" } | Select-Object -First 1
  if ($l) { return ($l -replace "^$cle=", '').Trim('"') } else { return $null }
}
$bin = (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' | Sort-Object FullName -Descending | Select-Object -First 1).DirectoryName
$hote = Lire-Env 'DB_HOST'; if (-not $hote) { $hote = 'localhost' }
$port = Lire-Env 'DB_PORT'; if (-not $port) { $port = '5432' }
$compte = Lire-Env 'DB_USERNAME'; $base = Lire-Env 'DB_DATABASE'
$env:PGPASSWORD = Lire-Env 'DB_PASSWORD'
$racine = Lire-Env 'STORAGE_ROOT'; if (-not $racine) { $racine = "$app\storage" }
$racine = [IO.Path]::GetFullPath($racine)

if ($Simulation) {
  Write-Host 'MODE SIMULATION : aucune donnée ne sera supprimée.' -ForegroundColor Cyan
} else {
  Write-Host "Base : $base sur $hote`:$port" -ForegroundColor Yellow
  Write-Host 'Cette opération SUPPRIME tous les courriers, projets et documents GED du SIM.' -ForegroundColor Yellow
  Write-Host 'Les utilisateurs, entités, paramètres et le plan de classement sont conservés.' -ForegroundColor Yellow
  if ($AvecContacts) { Write-Host 'Le carnet d''adresses des courriers (contacts) sera aussi vidé.' -ForegroundColor Yellow }
  $ok = Read-Host 'Tapez PURGER pour confirmer'
  if ($ok -cne 'PURGER') { Write-Host 'Annulé : rien n''a été modifié.'; exit 1 }
}

$s = Get-Date -Format 'yyyyMMdd-HHmm'
$b = if ($Simulation) { "$env:TEMP\simulation-purge-$s" } else { "C:\backups\avant-purge-$s" }
New-Item -ItemType Directory -Force -Path $b | Out-Null

$arrete = $false
try {
  if (-not $Simulation) {
    Stop-Service $service; $arrete = $true
    Write-Output 'API arrêtée.'
    & "$bin\pg_dump.exe" -h $hote -p $port -U $compte -Fc -f "$b\$base.dump" $base
    if ($LASTEXITCODE -ne 0) { throw 'Sauvegarde en échec : rien n''a été supprimé' }
    Write-Output "Sauvegarde : $b\$base.dump"
  }

  $simu = if ($Simulation) { 'on' } else { 'off' }
  $cont = if ($AvecContacts) { 'on' } else { 'off' }
  Push-Location $b
  & "$bin\psql.exe" -h $hote -p $port -U $compte -d $base -v "simulation=$simu" -v "contacts=$cont" -f $sql
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { throw 'Purge en échec : la transaction a été annulée, aucune donnée n''a été supprimée' }

  if (-not $Simulation) {
    # Fichiers : déplacés dans la sauvegarde (récupérables), pas effacés
    $n = 0
    foreach ($lot in @(@{ liste = 'fichiers-courrier.txt'; base = $racine; dest = "$b\fichiers\courrier" },
                       @{ liste = 'fichiers-ged.txt'; base = (Join-Path $racine 'ged'); dest = "$b\fichiers\ged" })) {
      $liste = Join-Path $b $lot.liste
      if (-not (Test-Path $liste)) { continue }
      $baseLot = [IO.Path]::GetFullPath($lot.base)
      foreach ($rel in Get-Content $liste) {
        if (-not $rel) { continue }
        $f = [IO.Path]::GetFullPath((Join-Path $baseLot $rel))
        if (-not $f.StartsWith($baseLot + '\') -or -not (Test-Path $f)) { continue }
        $cible = Join-Path $lot.dest $rel
        New-Item -ItemType Directory -Force -Path (Split-Path $cible) | Out-Null
        Move-Item $f $cible -Force; $n++
        $dossier = Split-Path $f
        if ($dossier -ne $baseLot -and -not (Get-ChildItem $dossier -Force)) { Remove-Item $dossier -Force }
      }
    }
    Write-Output "Fichiers mis de côté : $n (dans $b\fichiers)"
  }
} finally {
  if ($arrete) {
    Start-Service $service
    Start-Sleep -Seconds 5
    Write-Output "API : $((Get-Service $service).Status)"
  }
}

if ($Simulation) {
  Write-Host 'Simulation terminée : relancez sans -Simulation pour purger.' -ForegroundColor Cyan
} else {
  Write-Host "Purge terminée. Sauvegarde et fichiers : $b" -ForegroundColor Green
  Write-Host 'Le prochain courrier arrivé portera le numéro 0000001.' -ForegroundColor Green
}
