# Installation de l'agent de numérisation SIM sur un poste (à lancer en administrateur).
#  1. autorise l'écoute sur http://localhost:<port>/ pour les utilisateurs du poste ;
#  2. crée une tâche planifiée qui démarre l'agent à l'ouverture de session (caché).
# Prérequis : NAPS2 installé (https://www.naps2.com) et un profil nommé comme
# dans config.json (« SIM » par défaut) pointant vers le scanner du poste.
$ErrorActionPreference = 'Stop'
$dossier = Split-Path -Parent $MyInvocation.MyCommand.Path
$config = Get-Content (Join-Path $dossier 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$url = "http://localhost:$($config.port)/"

netsh http delete urlacl url=$url 2>$null | Out-Null
netsh http add urlacl url=$url sddl="D:(A;;GX;;;BU)" | Out-Null

$script = Join-Path $dossier 'sim-scan-agent.ps1'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$script`""
$declencheur = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -GroupId 'BUILTIN\Users' -RunLevel Limited
$reglages = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName 'SIM - Agent de numerisation' -Action $action -Trigger $declencheur `
  -Principal $principal -Settings $reglages -Force | Out-Null

if (-not (Test-Path $config.naps2)) { Write-Warning "NAPS2 introuvable ($($config.naps2)) : installez-le avant d'utiliser l'agent." }
Start-ScheduledTask -TaskName 'SIM - Agent de numerisation'
Start-Sleep 2
try { Invoke-RestMethod "$($url)status" | Format-List } catch { Write-Warning "L'agent ne répond pas encore : $($_.Exception.Message)" }
Write-Host "Agent installé. Il démarrera automatiquement à chaque ouverture de session."
