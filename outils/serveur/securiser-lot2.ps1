# SIM-DGIRD — sécurisation du serveur, lot 2 de l'audit (v8.6.6)
# À lancer UNE fois, en administrateur, APRÈS la mise à jour v8.6.6 :
#   powershell -ExecutionPolicy Bypass -File C:\recette-v8-6-6\outils\serveur\securiser-lot2.ps1
# Ce script :
#  1. ajoute les en-têtes de sécurité dans IIS (CSP, Permissions-Policy, etc.)
#     et masque les en-têtes qui révèlent les versions (Server, X-Powered-By) ;
#  2. crée le compte de base dédié « sim_app » (non super-utilisateur),
#     lui transfère les objets de l'application et l'utilise à la place de postgres ;
#  3. fait passer la connexion à la base par 127.0.0.1 et ferme le port 5432
#     aux autres postes.
# Chaque étape est vérifiée ; en cas d'échec, la configuration précédente est remise.
$ErrorActionPreference = 'Stop'
$app = 'C:\sim-dgird'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$horodatage = Get-Date -Format 'yyyyMMdd-HHmm'
$sauvegarde = "C:\backups\lot2-$horodatage"
New-Item -ItemType Directory -Force -Path $sauvegarde | Out-Null
$envFichier = Join-Path $app '.env'
$webConfig = Join-Path $app 'dist\web.config'
Copy-Item $envFichier (Join-Path $sauvegarde 'env.avant') -Force
Copy-Item $webConfig (Join-Path $sauvegarde 'web.config.avant') -Force
$resultats = @("Sauvegarde de la configuration : $sauvegarde")

function Lire-Env($cle) {
  $ligne = Get-Content $envFichier | Where-Object { $_ -match "^$cle=" } | Select-Object -First 1
  if ($ligne) { return ($ligne -replace "^$cle=", '').Trim('"') }
  return $null
}
function Ecrire-Env($cle, $valeur) {
  $lignes = Get-Content $envFichier
  if ($lignes | Where-Object { $_ -match "^$cle=" }) {
    $lignes = $lignes | ForEach-Object { if ($_ -match "^$cle=") { "$cle=$valeur" } else { $_ } }
  } else { $lignes += "$cle=$valeur" }
  # Écriture sans BOM : le fichier .env doit rester lisible par l'API.
  [IO.File]::WriteAllLines($envFichier, [string[]]$lignes)
}
function Tester-Site {
  try { return (Invoke-WebRequest 'http://localhost:8080/' -UseBasicParsing -TimeoutSec 15).StatusCode -eq 200 } catch { return $false }
}
function Tester-Api {
  try {
    Invoke-WebRequest 'http://localhost:8080/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"verification@sim.local","password":"x"}' -UseBasicParsing -TimeoutSec 20 | Out-Null
    return $false
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    return ($code -eq 401 -or $code -eq 429)
  }
}

# ---------- 1. En-têtes de sécurité IIS ----------
[xml]$xml = Get-Content $webConfig
$sws = $xml.configuration.'system.webServer'
if (-not $sws) { $sws = $xml.CreateElement('system.webServer'); $xml.configuration.AppendChild($sws) | Out-Null }
$http = $sws.SelectSingleNode('httpProtocol')
if (-not $http) { $http = $xml.CreateElement('httpProtocol'); $sws.AppendChild($http) | Out-Null }
$headers = $http.SelectSingleNode('customHeaders')
if (-not $headers) { $headers = $xml.CreateElement('customHeaders'); $http.AppendChild($headers) | Out-Null }
function Definir-Entete($nom, $valeur) {
  foreach ($n in @($headers.SelectNodes("add[@name='$nom']"))) { $headers.RemoveChild($n) | Out-Null }
  foreach ($n in @($headers.SelectNodes("remove[@name='$nom']"))) { $headers.RemoveChild($n) | Out-Null }
  $r = $xml.CreateElement('remove'); $r.SetAttribute('name', $nom); $headers.AppendChild($r) | Out-Null
  if ($valeur) { $a = $xml.CreateElement('add'); $a.SetAttribute('name', $nom); $a.SetAttribute('value', $valeur); $headers.AppendChild($a) | Out-Null }
}
Definir-Entete 'X-Powered-By' $null
Definir-Entete 'Content-Security-Policy' "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self' blob:; object-src 'self' blob:; base-uri 'self'; form-action 'self'; frame-ancestors 'self'"
Definir-Entete 'Permissions-Policy' 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
Definir-Entete 'X-Content-Type-Options' 'nosniff'
Definir-Entete 'X-Frame-Options' 'SAMEORIGIN'
Definir-Entete 'Referrer-Policy' 'strict-origin-when-cross-origin'
$sec = $sws.SelectSingleNode('security')
if (-not $sec) { $sec = $xml.CreateElement('security'); $sws.AppendChild($sec) | Out-Null }
$rf = $sec.SelectSingleNode('requestFiltering')
if (-not $rf) { $rf = $xml.CreateElement('requestFiltering'); $sec.AppendChild($rf) | Out-Null }
$rf.SetAttribute('removeServerHeader', 'true')
$xml.Save($webConfig)
Start-Sleep 2
if (Tester-Site) { $resultats += 'IIS : en-têtes de sécurité appliqués' }
else {
  Copy-Item (Join-Path $sauvegarde 'web.config.avant') $webConfig -Force
  $resultats += 'IIS : ECHEC, web.config d''origine remis (site inchangé)'
}

# ---------- 2 et 3. Compte de base dédié + connexion locale ----------
$psql = (Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' | Sort-Object FullName -Descending | Select-Object -First 1).FullName
$hote = Lire-Env 'DB_HOST'; if (-not $hote) { $hote = 'localhost' }
$port = Lire-Env 'DB_PORT'; if (-not $port) { $port = '5432' }
$base = Lire-Env 'DB_DATABASE'; if (-not $base) { $base = 'sim_dgird_prod' }
$compteActuel = Lire-Env 'DB_USERNAME'
if ($compteActuel -eq 'sim_app') {
  $resultats += 'Base : le compte sim_app est déjà utilisé, étape ignorée'
} else {
  $env:PGPASSWORD = Lire-Env 'DB_PASSWORD'
  $caracteres = [char[]]'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  $mdp = -join (1..32 | ForEach-Object { $caracteres | Get-Random })
  & $psql -h $hote -p $port -U $compteActuel -d $base -v "base=$base" -v "mdp=$mdp" -f (Join-Path $source 'compte-base-dedie.sql') | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Création du compte sim_app en échec : rien n''a été modifié dans la configuration' }

  # Connexion par 127.0.0.1 si elle fonctionne.
  $env:PGPASSWORD = $mdp
  $hoteCible = $hote
  & $psql -h 127.0.0.1 -p $port -U sim_app -d $base -t -c 'select 1' | Out-Null
  if ($LASTEXITCODE -eq 0) { $hoteCible = '127.0.0.1' }
  else {
    & $psql -h $hote -p $port -U sim_app -d $base -t -c 'select 1' | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Le compte sim_app ne peut pas se connecter : configuration inchangée' }
  }

  Ecrire-Env 'DB_USERNAME' 'sim_app'
  Ecrire-Env 'DB_PASSWORD' $mdp
  Ecrire-Env 'DB_HOST' $hoteCible
  Restart-Service SimDgirdApi
  Start-Sleep 12
  if (Tester-Api) {
    $resultats += "Base : l'application utilise désormais le compte sim_app (hôte $hoteCible)"
    if ($hoteCible -eq '127.0.0.1') {
      if (-not (Get-NetFirewallRule -DisplayName 'SIM-DGIRD PostgreSQL local uniquement' -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName 'SIM-DGIRD PostgreSQL local uniquement' -Direction Inbound -Protocol TCP -LocalPort $port -Action Block | Out-Null
      }
      $resultats += "Pare-feu : port $port de PostgreSQL fermé aux autres postes"
    } else {
      $resultats += "Pare-feu : port $port laissé ouvert (la base ne répond pas sur 127.0.0.1)"
    }
  } else {
    Copy-Item (Join-Path $sauvegarde 'env.avant') $envFichier -Force
    Restart-Service SimDgirdApi
    Start-Sleep 10
    $resultats += 'Base : ECHEC du démarrage avec sim_app — configuration précédente remise (le compte sim_app existe mais n''est pas utilisé)'
  }
}

$resultats += 'Service : ' + (Get-Service SimDgirdApi).Status
$resultats | ForEach-Object { Write-Output $_ }
Write-Output 'Recommandé ensuite : changer le mot de passe du compte postgres (il n''est plus utilisé par le SIM).'
