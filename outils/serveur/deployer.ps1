# SIM-DGIRD — déploiement d'une version (v8.6.6)
# Usage, en administrateur :
#   powershell -ExecutionPolicy Bypass -File C:\recette-vX\outils\serveur\deployer.ps1 -Zip C:\sim-vX.zip
# Étapes : décompression → contrôle du paquet → sauvegarde base + application →
# arrêt du service → copie → redémarrage → vérification. En cas d'échec du
# redémarrage, l'application précédente est remise automatiquement.
param([Parameter(Mandatory = $true)][string]$Zip)
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
if (-not (Test-Path $Zip)) { throw "Paquet introuvable : $Zip" }
$nom = [IO.Path]::GetFileNameWithoutExtension($Zip)
$recette = "C:\recette-$nom"
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $recette) { Remove-Item $recette -Recurse -Force }
[IO.Compression.ZipFile]::ExtractToDirectory($Zip, $recette)

# Contrôles du paquet
if (-not (Test-Path "$recette\dist\index.html")) { throw 'Paquet incomplet : écrans absents' }
$bundle = Get-ChildItem "$recette\dist\assets\index-*.js" | Select-Object -First 1
if ((Select-String -Path $bundle.FullName -Pattern 'localhost:3001' -SimpleMatch -Quiet)) { throw 'Paquet refusé : les écrans pointent vers un serveur de test' }
$serveur = Test-Path "$recette\dist-server\main.js"

function Lire-Env($cle) {
  $ligne = Get-Content "$app\.env" | Where-Object { $_ -match "^$cle=" } | Select-Object -First 1
  if ($ligne) { return ($ligne -replace "^$cle=", '').Trim('"') }
  return $null
}
function Tester-Api {
  try {
    Invoke-WebRequest 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"verification@sim.local","password":"x"}' -UseBasicParsing -TimeoutSec 20 | Out-Null
    return $false
  } catch { $c = $_.Exception.Response.StatusCode.value__; return ($c -eq 401 -or $c -eq 429) }
}

# Sauvegarde
$s = Get-Date -Format 'yyyyMMdd-HHmm'
$b = "C:\backups\sim-dgird-$s"
New-Item -ItemType Directory -Force -Path $b | Out-Null
$env:PGPASSWORD = Lire-Env 'DB_PASSWORD'
$pgdump = (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' | Sort-Object FullName -Descending | Select-Object -First 1).FullName
& $pgdump -h (Lire-Env 'DB_HOST') -U (Lire-Env 'DB_USERNAME') -Fc -f "$b\base.dump" (Lire-Env 'DB_DATABASE')
if ($LASTEXITCODE -ne 0) { throw 'Sauvegarde de la base en échec : déploiement annulé' }
Copy-Item "$app\dist", "$app\dist-server" $b -Recurse

# Copie
if ($serveur) { Stop-Service SimDgirdApi; Start-Sleep 3 }
if (Test-Path "$recette\node_modules") { robocopy "$recette\node_modules" "$app\node_modules" /E /NFL /NDL /NJH /NJS /NP | Out-Null }
if ($serveur) { robocopy "$recette\dist-server" "$app\dist-server" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null }
robocopy "$recette\dist" "$app\dist" /MIR /XF web.config /NFL /NDL /NJH /NJS /NP | Out-Null
if (Test-Path "$recette\outils") { robocopy "$recette\outils" "$app\outils" /E /NFL /NDL /NJH /NJS /NP | Out-Null }
if ($serveur) { Start-Service SimDgirdApi; Start-Sleep 12 }

if (Tester-Api) {
  Write-Output "DEPLOIEMENT REUSSI ($nom) - service : $((Get-Service SimDgirdApi).Status) - sauvegarde : $b"
} else {
  Write-Output 'ECHEC de la vérification : remise de la version précédente...'
  Stop-Service SimDgirdApi -ErrorAction SilentlyContinue; Start-Sleep 3
  robocopy "$b\dist-server" "$app\dist-server" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
  robocopy "$b\dist" "$app\dist" /MIR /XF web.config /NFL /NDL /NJH /NJS /NP | Out-Null
  Start-Service SimDgirdApi; Start-Sleep 10
  Write-Output "Version précédente remise - service : $((Get-Service SimDgirdApi).Status) - sauvegarde : $b"
}
