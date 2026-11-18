# SIM-DGIRD — sauvegarde quotidienne (v8.6.5)
# Sauvegarde la base PostgreSQL et le dossier des fichiers joints dans
# C:\backups\quotidien\<date>, et supprime les sauvegardes de plus de 30 jours.
# Lancée chaque nuit par la tâche planifiée « SIM-DGIRD sauvegarde quotidienne ».
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
$racine = 'C:\backups\quotidien'
$jour = Get-Date -Format 'yyyy-MM-dd'
$cible = Join-Path $racine $jour
New-Item -ItemType Directory -Force -Path $cible | Out-Null
$journal = Join-Path $cible 'journal.txt'

function Lire-Env($cle) {
  $ligne = Get-Content (Join-Path $app '.env') | Where-Object { $_ -match "^$cle=" } | Select-Object -First 1
  if ($ligne) { return ($ligne -replace "^$cle=", '').Trim('"') }
  return $null
}

try {
  $env:PGPASSWORD = Lire-Env 'DB_PASSWORD'
  $hote = Lire-Env 'DB_HOST'; if (-not $hote) { $hote = 'localhost' }
  $port = Lire-Env 'DB_PORT'; if (-not $port) { $port = '5432' }
  $compte = Lire-Env 'DB_USERNAME'; if (-not $compte) { $compte = 'postgres' }
  $base = Lire-Env 'DB_DATABASE'; if (-not $base) { $base = 'sim_dgird_prod' }
  $pgdump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' | Sort-Object FullName -Descending | Select-Object -First 1
  & $pgdump.FullName -h $hote -p $port -U $compte -Fc -f (Join-Path $cible "$base.dump") $base
  if ($LASTEXITCODE -ne 0) { throw "pg_dump a échoué (code $LASTEXITCODE)" }
  "Base sauvegardée : $base" | Out-File $journal -Append

  $stockage = Lire-Env 'STORAGE_ROOT'; if (-not $stockage) { $stockage = Join-Path $app 'storage' }
  if (Test-Path $stockage) {
    robocopy $stockage (Join-Path $cible 'fichiers') /E /R:1 /W:1 /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "Copie des fichiers en échec (robocopy $LASTEXITCODE)" }
    "Fichiers sauvegardés : $stockage" | Out-File $journal -Append
  }
  Copy-Item (Join-Path $app '.env') (Join-Path $cible 'env.sauvegarde') -Force

  Get-ChildItem $racine -Directory | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | Remove-Item -Recurse -Force
  "OK $(Get-Date -Format 'yyyy-MM-dd HH:mm')" | Out-File $journal -Append
} catch {
  "ERREUR $(Get-Date -Format 'yyyy-MM-dd HH:mm') : $($_.Exception.Message)" | Out-File $journal -Append
  exit 1
}
