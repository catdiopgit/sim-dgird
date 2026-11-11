# Agent de numérisation SIM-DGIRD
# ---------------------------------------------------------------------------
# Petit service HTTP local (http://localhost:<port>) que l'application SIM
# appelle depuis le navigateur pour numériser un document. Il pilote le scanner
# du poste via NAPS2 (pilotes TWAIN / WIA) et renvoie un PDF.
#
# Le modèle de scanner n'apparaît nulle part dans ce script : il est choisi dans
# le profil NAPS2 (nom indiqué dans config.json). Changer de scanner = installer
# son pilote puis modifier le profil dans NAPS2, sans toucher au code.
#
#   GET  /status  -> {"ok":true,"scanner":"<profil>"}
#   POST /scan    -> application/pdf (toutes les pages du chargeur ou la vitre)
# ---------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'
$dossier = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Get-Content (Join-Path $dossier 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$journal = Join-Path $dossier 'agent-scan.log'
function Journaliser([string]$texte) {
  Add-Content -Path $journal -Value ("{0:yyyy-MM-dd HH:mm:ss}  {1}" -f (Get-Date), $texte) -Encoding UTF8
}

$ecoute = New-Object System.Net.HttpListener
$ecoute.Prefixes.Add("http://localhost:$($config.port)/")
$ecoute.Start()
Journaliser "Agent démarré sur le port $($config.port) (profil NAPS2 « $($config.profil) »)"

function Ecrire-Entetes($requete, $reponse) {
  $origine = $requete.Headers['Origin']
  if ($origine -and ($config.originesAutorisees -contains $origine)) {
    $reponse.Headers.Add('Access-Control-Allow-Origin', $origine)
    $reponse.Headers.Add('Vary', 'Origin')
    $reponse.Headers.Add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    $reponse.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
    # Accès d'une page du réseau local vers localhost (Chrome : Private/Local Network Access)
    $reponse.Headers.Add('Access-Control-Allow-Private-Network', 'true')
  }
}
function Repondre-Texte($reponse, [int]$code, [string]$texte, [string]$type = 'text/plain; charset=utf-8') {
  $octets = [System.Text.Encoding]::UTF8.GetBytes($texte)
  $reponse.StatusCode = $code
  $reponse.ContentType = $type
  $reponse.OutputStream.Write($octets, 0, $octets.Length)
  $reponse.Close()
}

while ($ecoute.IsListening) {
  $contexte = $ecoute.GetContext()
  $requete = $contexte.Request
  $reponse = $contexte.Response
  try {
    Ecrire-Entetes $requete $reponse
    $origine = $requete.Headers['Origin']
    if ($origine -and -not ($config.originesAutorisees -contains $origine)) {
      Repondre-Texte $reponse 403 "Origine non autorisée : $origine"
      continue
    }
    $chemin = $requete.Url.AbsolutePath.TrimEnd('/')
    if ($requete.HttpMethod -eq 'OPTIONS') { $reponse.StatusCode = 204; $reponse.Close(); continue }

    if ($requete.HttpMethod -eq 'GET' -and $chemin -eq '/status') {
      $pret = Test-Path $config.naps2
      Repondre-Texte $reponse 200 (@{ ok = $pret; scanner = $config.profil } | ConvertTo-Json -Compress) 'application/json'
      continue
    }

    if ($requete.HttpMethod -eq 'POST' -and $chemin -eq '/scan') {
      if (-not (Test-Path $config.naps2)) { Repondre-Texte $reponse 500 "NAPS2 introuvable : $($config.naps2)"; continue }
      $sortie = Join-Path $env:TEMP ("sim-scan-{0}.pdf" -f [guid]::NewGuid())
      Journaliser "Numérisation demandée par $origine"
      $proc = Start-Process -FilePath $config.naps2 -ArgumentList @('-o', "`"$sortie`"", '-p', "`"$($config.profil)`"", '--force') `
        -NoNewWindow -Wait -PassThru -RedirectStandardError (Join-Path $env:TEMP 'sim-scan-err.txt')
      if ($proc.ExitCode -ne 0 -or -not (Test-Path $sortie)) {
        $erreur = Get-Content (Join-Path $env:TEMP 'sim-scan-err.txt') -Raw -ErrorAction SilentlyContinue
        Journaliser "Échec NAPS2 (code $($proc.ExitCode)) : $erreur"
        Repondre-Texte $reponse 500 ("Le scanner n'a pas pu numériser : vérifiez qu'il est allumé et que le document est en place. " + $erreur)
        continue
      }
      $octets = [System.IO.File]::ReadAllBytes($sortie)
      Remove-Item $sortie -Force
      $reponse.StatusCode = 200
      $reponse.ContentType = 'application/pdf'
      $reponse.OutputStream.Write($octets, 0, $octets.Length)
      $reponse.Close()
      Journaliser ("Numérisation terminée ({0:N0} octets)" -f $octets.Length)
      continue
    }

    Repondre-Texte $reponse 404 'Introuvable'
  } catch {
    Journaliser "Erreur : $($_.Exception.Message)"
    try { Repondre-Texte $reponse 500 $_.Exception.Message } catch {}
  }
}
