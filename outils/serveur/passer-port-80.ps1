# SIM-DGIRD - Passage du site sur le port 80 (en attendant le certificat HTTPS).
# A lancer en administrateur :  powershell -ExecutionPolicy Bypass -File C:\sim-dgird\outils\serveur\passer-port-80.ps1
# - garde la liaison 8080 (transition, scripts de deploiement) ;
# - ajoute la liaison 80 au site SIM, ouvre le pare-feu, teste, et revient en arriere si echec.
$ErrorActionPreference = 'Stop'
Import-Module WebAdministration

function Ecrire($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }

# 1. Site SIM = celui qui ecoute sur 8080
$site = Get-Website | Where-Object { $_.Bindings.Collection | Where-Object { $_.protocol -eq 'http' -and $_.bindingInformation -match ':8080:' } } | Select-Object -First 1
if (-not $site) { Ecrire 'ECHEC : aucun site IIS ne porte la liaison 8080.' Red; exit 1 }
Ecrire "Site SIM : $($site.Name)" Cyan

$deja = $site.Bindings.Collection | Where-Object { $_.protocol -eq 'http' -and $_.bindingInformation -match ':80:' }
if ($deja) { Ecrire 'Le site SIM a deja une liaison sur le port 80.' Yellow }
else {
  # 2. Port 80 libre ?
  $autres = Get-Website | Where-Object { $_.Name -ne $site.Name -and ($_.Bindings.Collection | Where-Object { $_.protocol -eq 'http' -and $_.bindingInformation -match ':80:' }) }
  foreach ($a in $autres) {
    Ecrire "Le site IIS '$($a.Name)' utilise le port 80 : arret et demarrage automatique desactive." Yellow
    Stop-Website -Name $a.Name -ErrorAction SilentlyContinue
    Set-ItemProperty "IIS:\Sites\$($a.Name)" -Name serverAutoStart -Value $false
  }
  $ecoute = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -ne 4 }
  if ($ecoute) {
    $p = Get-Process -Id $ecoute[0].OwningProcess -ErrorAction SilentlyContinue
    Ecrire "ECHEC : le port 80 est occupe par le programme '$($p.ProcessName)' (PID $($ecoute[0].OwningProcess)). Arretez-le puis relancez ce script." Red
    exit 1
  }

  # 3. Liaison 80
  New-WebBinding -Name $site.Name -Protocol http -Port 80 -IPAddress '*'
  Ecrire 'Liaison http *:80 ajoutee.' Green
}

# 4. Pare-feu
if (-not (Get-NetFirewallRule -DisplayName 'SIM-DGIRD Web HTTP 80' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'SIM-DGIRD Web HTTP 80' -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow -Profile Any | Out-Null
  Ecrire 'Regle de pare-feu "SIM-DGIRD Web HTTP 80" creee.' Green
}

# 5. Tests
Start-Sleep -Seconds 2
$okPage = $false; $okApi = $false
try { $okPage = (Invoke-WebRequest 'http://localhost/' -UseBasicParsing -TimeoutSec 15).StatusCode -eq 200 } catch {}
try {
  Invoke-WebRequest 'http://localhost/api/auth/login' -Method Post -ContentType 'application/json' -Body '{"email":"verification@sim.local","password":"x"}' -UseBasicParsing -TimeoutSec 20 | Out-Null
} catch { $code = [int]$_.Exception.Response.StatusCode; $okApi = ($code -eq 401 -or $code -eq 429) }

if ($okPage -and $okApi) {
  $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '10.*' } | Select-Object -First 1).IPAddress
  Ecrire ''
  Ecrire "PORT 80 ACTIF - SIM accessible sur http://$ip (le port 8080 reste actif pendant la transition)" Green
} else {
  Ecrire "ECHEC du test (page : $okPage, API : $okApi) - retour en arriere." Red
  if (-not $deja) { Remove-WebBinding -Name $site.Name -Protocol http -Port 80 -IPAddress '*' -ErrorAction SilentlyContinue }
  exit 1
}
