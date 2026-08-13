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
# Where to pull the production uploads from, and the session that authorises
# listing them. Both come from the shell profile, like PROD_DATABASE_URL — this
# script never reads the app's .env.
$ProdBaseUrl  = if ($env:PROD_BASE_URL) { $env:PROD_BASE_URL.TrimEnd('/') } else { "https://bpr.clinic" }
# A long-lived token rather than a session cookie: cookies are httpOnly and
# expire, so the backup would stop working every few weeks without saying so.
$BackupToken  = $env:BACKUP_TOKEN

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
    # Write via .NET rather than Out-File: PowerShell 5.1's -Encoding UTF8
    # prepends a BOM, which psql treats as part of the first statement.
    $dump = docker exec $DockerLocal pg_dump -U $LocalDbUser --no-owner --no-acl $LocalDbName
    [System.IO.File]::WriteAllLines($outFile, $dump, (New-Object System.Text.UTF8Encoding $false))
    $sizeKB = [math]::Round((Get-Item $outFile).Length / 1024, 1)
    Write-OK "local-db.sql ($sizeKB KB)"
  } catch {
    Write-Fail "Local DB backup failed: $_"
  }
}

# 2. PRODUCTION DATABASE
# Reads the connection string from $env:PROD_DATABASE_URL (set this in your
# shell profile or pass -ProdDatabaseUrl — it is NOT the app's local .env,
# to avoid ever needing this script to read that file). Previously this
# called the Render API for a Postgres instance that's no longer in use
# after migrating to Coolify/VPS — that's why prior backups here silently
# never actually captured the real production database. See BACKUP_GUIDE.md.
#
# Uses a disposable postgres:18-alpine container just for the pg_dump/psql
# client tools (pulled automatically on first run) — pg_dump must be >= the
# server's major version, and production runs Postgres 18 while the local
# dev container ($DockerLocal) runs 16. This also means the prod backup no
# longer depends on the local dev container being up at all.
if (-not $SkipProd) {
  Write-Step "Production database (Coolify VPS)"
  $outFile  = Join-Path $BackupDir "prod-db.sql"
  $errFile  = Join-Path $env:TEMP "bpr_pg_dump_err.log"
  try {
    $prodUrl = if ($ProdDatabaseUrl) { $ProdDatabaseUrl } else { $env:PROD_DATABASE_URL }
    if (-not $prodUrl) {
      throw "No production DATABASE_URL configured. Set `$env:PROD_DATABASE_URL (e.g. in your PowerShell profile) or pass -ProdDatabaseUrl 'postgresql://user:pass@host:5432/dbname'."
    }

    $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
    # pg_dump writes straight into a mounted volume instead of coming back
    # through PowerShell. `1>` here produced UTF-16LE, which psql cannot read —
    # every prod backup taken this way was silently unrestorable.
    docker run --rm -v "${BackupDir}:/backup" postgres:18-alpine pg_dump $prodUrl --no-owner --no-acl -f /backup/prod-db.sql 2>$errFile
    $ErrorActionPreference = $prev

    $dumpErr = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
    if ($dumpErr -match "error|fatal") { throw "pg_dump error: $dumpErr" }

    if (-not (Test-Path $outFile) -or (Get-Item $outFile).Length -lt 1024) {
      throw "prod-db.sql missing or too small - backup may have failed"
    }
    $sizeKB = [math]::Round((Get-Item $outFile).Length / 1024, 1)
    Write-OK "prod-db.sql ($sizeKB KB)"
  } catch {
    Write-Fail "Production DB backup failed: $_"
  } finally {
    if (Test-Path $errFile) { Remove-Item $errFile -Force }
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

# 4a. LOCAL UPLOAD FILES (developer machine — NOT the server)
$localFileCount = 0
if (-not $SkipFiles) {
  Write-Step "Local upload files (this machine)"
  $uploadsDir = Join-Path $ProjectRoot "public\uploads"
  # Named "local-uploads" now. It used to be just "uploads", which read like the
  # server's files and hid the fact that production was never backed up at all.
  $outDir     = Join-Path $BackupDir "local-uploads"
  try {
    if (Test-Path $uploadsDir) {
      robocopy $uploadsDir $outDir /E /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
      $localFileCount = (Get-ChildItem $outDir -Recurse -File -ErrorAction SilentlyContinue).Count
      Write-OK "local-uploads/ ($localFileCount files)"
    } else {
      Write-OK "no local uploads folder - skipped"
    }
  } catch {
    Write-Fail "Local files backup failed: $_"
  }
}

# 4b. PRODUCTION UPLOAD FILES (the ones that actually matter)
# Exercise videos live in Cloudflare R2 and are replicated there. Everything
# else — article images, the logo, patient documents — exists only on the VPS
# disk, so this is the only copy that will ever exist off that machine.
#
# Transport is HTTP rather than rsync because the SSH key on this machine is not
# authorised on the VPS. The file list comes from an authenticated endpoint; the
# files themselves come from /uploads/*, which already serves them publicly.
$prodFileCount = 0
$prodExpected  = 0
$prodFailed    = @()
if (-not $SkipFiles -and -not $SkipProd) {
  Write-Step "Production upload files ($ProdBaseUrl)"
  $outDir = Join-Path $BackupDir "prod-uploads"
  try {
    if (-not $BackupToken) {
      throw "No `$env:BACKUP_TOKEN set. Add the same value to the Coolify env vars and to your PowerShell profile."
    }

    $headers  = @{ "x-backup-token" = $BackupToken }
    $manifest = Invoke-RestMethod -Uri "$ProdBaseUrl/api/admin/backup/uploads" -Headers $headers -TimeoutSec 60
    $prodExpected = [int]$manifest.count
    Write-Host "   server reports $prodExpected file(s), $($manifest.megabytes) MB" -ForegroundColor DarkGray

    New-Item -ItemType Directory -Force $outDir | Out-Null
    foreach ($f in $manifest.files) {
      $target = Join-Path $outDir ($f.path -replace '/', '\')
      New-Item -ItemType Directory -Force (Split-Path $target -Parent) | Out-Null
      try {
        Invoke-WebRequest -Uri "$ProdBaseUrl/uploads/$($f.path)" -OutFile $target -TimeoutSec 120 | Out-Null
        $prodFileCount++
      } catch {
        $prodFailed += $f.path
      }
    }

    if ($prodFileCount -ne $prodExpected) {
      # Loud on purpose: a partial copy reported as OK is what made the old
      # version dangerous.
      Write-Fail "prod-uploads/ INCOMPLETE - got $prodFileCount of $prodExpected ($($prodFailed.Count) failed)"
      if ($prodFailed.Count -gt 0) {
        # -join, not Join-String: that cmdlet is PowerShell 7+ and this runs on
        # 5.1, where the failure reporter would itself throw.
        $sample = ($prodFailed | Select-Object -First 5) -join ', '
        Write-Host "   first failures: $sample" -ForegroundColor Red
      }
    } else {
      Write-OK "prod-uploads/ ($prodFileCount of $prodExpected files)"
    }
  } catch {
    Write-Fail "Production files backup FAILED: $_"
  }
}

# 5. WRITE MANIFEST
$commitHash = git -C $ProjectRoot rev-parse HEAD 2>$null
$branch     = git -C $ProjectRoot branch --show-current 2>$null
$manifest   = @{
  timestamp        = $Timestamp
  commit           = $commitHash
  branch           = $branch
  localUploadFiles = $localFileCount
  prodUploadFiles  = $prodFileCount
  prodUploadExpected = $prodExpected
  prodUploadComplete = ($prodExpected -gt 0 -and $prodFileCount -eq $prodExpected)
  note             = "Exercise videos live in Cloudflare R2 and are not part of this archive."
} | ConvertTo-Json
# WriteAllText, not Out-File: PowerShell 5.1's -Encoding UTF8 prepends a BOM,
# which makes the manifest unreadable to every JSON parser — the same trap that
# made the database dumps unrestorable.
[System.IO.File]::WriteAllText(
  (Join-Path $BackupDir "manifest.json"),
  $manifest,
  (New-Object System.Text.UTF8Encoding $false)
)
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
