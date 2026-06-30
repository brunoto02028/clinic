# BPR Clinic - Full Backup Script
# Backs up: Local DB + Production DB + Code + Upload files
# Destination: C:\Users\bruno\Backups\bpr-clinic\
# Usage:  .\scripts\backup.ps1
#         .\scripts\backup.ps1 -SkipProd   (local only)
#         .\scripts\backup.ps1 -SkipLocal  (prod only)
param(
  [switch]$SkipLocal,
  [switch]$SkipProd,
  [switch]$SkipCode,
  [switch]$SkipFiles,
  [int]$KeepLast = 7
)

$ErrorActionPreference = "Stop"
$BackupRoot  = "C:\Users\bruno\Backups\bpr-clinic"
$ProjectRoot = $PSScriptRoot | Split-Path -Parent
$Timestamp   = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BackupDir   = Join-Path $BackupRoot $Timestamp
$RenderYaml  = "$env:USERPROFILE\.render\cli.yaml"
$DockerLocal = "bpr-clinic-db-local"
$LocalDbName = "bpr_clinic_local"
$LocalDbUser = "postgres"

New-Item -ItemType Directory -Force $BackupDir | Out-Null
Write-Host ""
Write-Host "=== BPR Clinic Backup - $Timestamp ===" -ForegroundColor Cyan

function Write-Step { param($msg) Write-Host "" ; Write-Host "-> $msg" -ForegroundColor Yellow }
function Write-OK   { param($msg) Write-Host "   OK: $msg" -ForegroundColor Green }
function Write-Fail { param($msg) Write-Host "   FAIL: $msg" -ForegroundColor Red }

# 1. LOCAL DATABASE
if (-not $SkipLocal) {
  Write-Step "Local database ($LocalDbName)"
  $outFile = Join-Path $BackupDir "local-db.sql"
  try {
    $running = docker inspect $DockerLocal --format "{{.State.Running}}" 2>$null
    if ($running -ne "true") { throw "Docker container '$DockerLocal' is not running" }
    docker exec $DockerLocal pg_dump -U $LocalDbUser --no-owner --no-acl $LocalDbName | Out-File $outFile -Encoding UTF8
    $sizeKB = [math]::Round((Get-Item $outFile).Length / 1024, 1)
    Write-OK "local-db.sql ($sizeKB KB)"
  } catch {
    Write-Fail "Local DB backup failed: $_"
  }
}

# 2. PRODUCTION DATABASE
if (-not $SkipProd) {
  Write-Step "Production database (Render - bpr_clinic)"
  $outFile   = Join-Path $BackupDir "prod-db.sql"
  $tmpScript = Join-Path $env:TEMP "bpr_pg_dump.sh"
  try {
    if (-not (Test-Path $RenderYaml)) { throw "Render CLI not configured ($RenderYaml not found)" }

    $apiKey   = (Get-Content $RenderYaml | Select-String "^\s+key:").Line.Split(":")[1].Trim()
    $connInfo = Invoke-RestMethod "https://api.render.com/v1/postgres/dpg-d8mgpurbc2fs73dvc160-a/connection-info" `
      -Headers @{ Authorization = "Bearer $apiKey" }
    $pgPass = $connInfo.password
    $pgHost = "dpg-d8mgpurbc2fs73dvc160-a.frankfurt-postgres.render.com"

    $running = docker inspect $DockerLocal --format "{{.State.Running}}" 2>$null
    if ($running -ne "true") { throw "Docker container '$DockerLocal' must be running for pg_dump" }

    # Write shell script to temp file (avoids PowerShell quoting issues with env vars)
    $shScript = "#!/bin/sh`nPGPASSWORD='$pgPass' pg_dump -h $pgHost -p 5432 -U bpr_clinic --no-owner --no-acl -f /tmp/prod_backup.sql bpr_clinic 2>/tmp/pg_dump_err.log`necho exit:`$?"
    [System.IO.File]::WriteAllText($tmpScript, $shScript)

    docker cp $tmpScript "${DockerLocal}:/tmp/bpr_pg_dump.sh" 2>&1 | Out-Null

    # Run script — disable Stop temporarily so docker non-zero exit doesn't throw
    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    docker exec $DockerLocal sh /tmp/bpr_pg_dump.sh 2>&1 | Out-Null
    $ErrorActionPreference = $prev

    # Check for pg_dump errors
    $dumpErr = docker exec $DockerLocal sh -c "cat /tmp/pg_dump_err.log 2>/dev/null" 2>&1
    if ($dumpErr -match "error|fatal") { throw "pg_dump error: $dumpErr" }

    # Copy result back to Windows
    $ErrorActionPreference = "Continue"
    docker cp "${DockerLocal}:/tmp/prod_backup.sql" $outFile 2>&1 | Out-Null
    docker exec $DockerLocal sh -c "rm -f /tmp/prod_backup.sql /tmp/bpr_pg_dump.sh /tmp/pg_dump_err.log" 2>&1 | Out-Null
    $ErrorActionPreference = "Stop"

    if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -lt 1024) {
      throw "prod-db.sql missing or too small - backup may have failed"
    }
    $sizeKB = [math]::Round((Get-Item $outFile).Length / 1024, 1)
    Write-OK "prod-db.sql ($sizeKB KB)"
  } catch {
    Write-Fail "Production DB backup failed: $_"
  } finally {
    if (Test-Path $tmpScript) { Remove-Item $tmpScript -Force }
  }
}

# 3. CODE ARCHIVE
if (-not $SkipCode) {
  Write-Step "Code archive (git)"
  $outFile = Join-Path $BackupDir "code.zip"
  try {
    $commit = git -C $ProjectRoot rev-parse --short HEAD
    git -C $ProjectRoot archive --format=zip --output=$outFile HEAD
    $sizeMB = [math]::Round((Get-Item $outFile).Length / 1MB, 2)
    Write-OK "code.zip ($sizeMB MB) - commit $commit"
  } catch {
    Write-Fail "Code archive failed: $_"
  }
}

# 4. UPLOAD FILES
if (-not $SkipFiles) {
  Write-Step "Upload files (public/uploads)"
  $uploadsDir = Join-Path $ProjectRoot "public\uploads"
  $outDir     = Join-Path $BackupDir "uploads"
  try {
    if (Test-Path $uploadsDir) {
      robocopy $uploadsDir $outDir /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      $count = (Get-ChildItem $outDir -Recurse -File -ErrorAction SilentlyContinue).Count
      Write-OK "uploads/ ($count files)"
    } else {
      Write-OK "uploads/ folder not found - skipped"
    }
  } catch {
    Write-Fail "Files backup failed: $_"
  }
}

# 5. WRITE MANIFEST
$commitHash = git -C $ProjectRoot rev-parse HEAD 2>$null
$branch     = git -C $ProjectRoot branch --show-current 2>$null
$manifest   = @{ timestamp = $Timestamp; commit = $commitHash; branch = $branch } | ConvertTo-Json
$manifest   | Out-File (Join-Path $BackupDir "manifest.json") -Encoding UTF8
Write-OK "manifest.json written"

# 6. ROTATE OLD BACKUPS
Write-Step "Rotating backups (keeping last $KeepLast)"
$all = Get-ChildItem $BackupRoot -Directory | Sort-Object Name
if ($all.Count -gt $KeepLast) {
  $toDelete = $all | Select-Object -First ($all.Count - $KeepLast)
  $toDelete | ForEach-Object {
    Remove-Item $_.FullName -Recurse -Force
    Write-Host "   Deleted old backup: $($_.Name)" -ForegroundColor DarkGray
  }
}

$keptCount = (Get-ChildItem $BackupRoot -Directory).Count
Write-Host ""
Write-Host "=== Backup complete: $BackupDir ===" -ForegroundColor Cyan
Write-Host "Backups kept: $keptCount / $KeepLast"
Write-Host ""
