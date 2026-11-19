# SIM-DGIRD — remise à zéro de la GED avant l'import du plan de classement v6
#   powershell -ExecutionPolicy Bypass -File C:\recette-sim-v8-6-10\outils\serveur\reinitialiser-ged.ps1
# 1. sauvegarde complète de la base ; 2. suppression des seules données GED
# (en une transaction : tout ou rien) ; 3. effacement des fichiers GED du disque.
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
function Lire-Env($cle) {
  $l = Get-Content "$app\.env" | Where-Object { $_ -match "^$cle=" } | Select-Object -First 1
  if ($l) { return ($l -replace "^$cle=", '').Trim('"') } else { return $null }
}
$bin = (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' | Sort-Object FullName -Descending | Select-Object -First 1).DirectoryName
$hote = Lire-Env 'DB_HOST'; $port = Lire-Env 'DB_PORT'; if (-not $port) { $port = '5432' }
$compte = Lire-Env 'DB_USERNAME'; $base = Lire-Env 'DB_DATABASE'
$env:PGPASSWORD = Lire-Env 'DB_PASSWORD'

$s = Get-Date -Format 'yyyyMMdd-HHmm'
$b = "C:\backups\avant-reinit-ged-$s"
New-Item -ItemType Directory -Force -Path $b | Out-Null
& "$bin\pg_dump.exe" -h $hote -p $port -U $compte -Fc -f "$b\$base.dump" $base
if ($LASTEXITCODE -ne 0) { throw 'Sauvegarde en échec : rien n''a été supprimé' }
Write-Output "Sauvegarde : $b\$base.dump"

Push-Location $b
& "$bin\psql.exe" -h $hote -p $port -U $compte -d $base -f (Join-Path $source 'reinitialiser-ged.sql')
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { throw 'Suppression en échec : la transaction a été annulée, la GED est inchangée' }

# Fichiers GED sur le disque
$racine = Lire-Env 'STORAGE_ROOT'; if (-not $racine) { $racine = "$app\storage" }
$ged = Join-Path $racine 'ged'
$liste = Join-Path $b 'fichiers-ged-a-supprimer.txt'
$n = 0
if ((Test-Path $liste) -and (Test-Path $ged)) {
  foreach ($rel in Get-Content $liste) {
    if (-not $rel) { continue }
    $f = [IO.Path]::GetFullPath((Join-Path $ged $rel))
    if ($f.StartsWith([IO.Path]::GetFullPath($ged)) -and (Test-Path $f)) { Remove-Item $f -Force; $n++ }
  }
}
Write-Output "Fichiers GED effacés : $n"
Write-Output 'GED remise à zéro. Importez maintenant le plan : Administration > Paramétrage > Plan de classement > Importer le plan de classement DGIRD.'
