#!/usr/bin/env pwsh
# ============================================================
# BPR.REHAB - Clinic Automation Pipeline
# ============================================================
# Automates: type-check -> Aider review/fix -> git push -> VPS deploy
#
# Usage:
#   .\scripts\clinic-pipeline.ps1              # Full pipeline
#   .\scripts\clinic-pipeline.ps1 -ReviewOnly  # Only review, no deploy
#   .\scripts\clinic-pipeline.ps1 -DeployOnly  # Only deploy, skip review
# ============================================================

param(
    [switch]$ReviewOnly,
    [switch]$DeployOnly,
    [switch]$SkipConfirm
)

$ErrorActionPreference = "Continue"
$ProjectDir = "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
$VPS = "root@bpr.rehab"
$VPSPath = "/root/clinic"
$LogFile = Join-Path $ProjectDir "scripts\pipeline.log"

function Write-Step($step, $msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host ""
    Write-Host "[$ts] STEP $step - $msg" -ForegroundColor Cyan
    Add-Content $LogFile "[$ts] STEP $step - $msg"
}
function Write-Ok($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
    Add-Content $LogFile "  OK: $msg"
}
function Write-Warn($msg) {
    Write-Host "  [WARN] $msg" -ForegroundColor Yellow
    Add-Content $LogFile "  WARN: $msg"
}
function Write-Fail($msg) {
    Write-Host "  [FAIL] $msg" -ForegroundColor Red
    Add-Content $LogFile "  FAIL: $msg"
}

# --- Start ---
$startTime = Get-Date
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  BPR.REHAB - Clinic Pipeline" -ForegroundColor Cyan
$now = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "  $now" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
Add-Content $LogFile "=== Pipeline started $now ==="

Set-Location $ProjectDir

# ============================================
# PHASE 1: PRE-CHECKS
# ============================================

Write-Step "1" "Pre-flight checks"

$ollamaRunning = $false
try {
    $null = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop
    $ollamaRunning = $true
    Write-Ok "Ollama is running"
} catch {
    Write-Warn "Ollama not running - Aider review will be skipped"
}

$gitStatus = git status --porcelain
if ($gitStatus) {
    $changedCount = @($gitStatus).Count
    Write-Ok "Git: $changedCount file(s) with changes"
} else {
    Write-Ok "Git: working tree clean"
}

# ============================================
# PHASE 2: TYPE CHECK
# ============================================

$errorCount = 0
if (-not $DeployOnly) {
    Write-Step "2" "Type checking (TypeScript)"

    $tscResult = npx tsc --noEmit 2>&1
    $tscErrors = @($tscResult | Select-String "error TS")
    $errorCount = $tscErrors.Count

    if ($errorCount -eq 0) {
        Write-Ok "No TypeScript errors"
    } else {
        Write-Warn "$errorCount TypeScript error(s) found"
        $tscErrors | Out-File (Join-Path $ProjectDir "scripts\ts-errors.txt") -Encoding utf8
        $tscErrors | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
    }
}

# ============================================
# PHASE 3: AIDER REVIEW & AUTO-FIX
# ============================================

if (-not $DeployOnly -and $ollamaRunning) {
    Write-Step "3" "Aider AI review (Ollama/qwen3-coder:30b)"

    $changedTsFiles = @(git diff --name-only HEAD 2>$null | Where-Object { $_ -match '\.(tsx?|ts)$' })
    if ($changedTsFiles.Count -eq 0) {
        $changedTsFiles = @(git diff --name-only --cached 2>$null | Where-Object { $_ -match '\.(tsx?|ts)$' })
    }

    if ($changedTsFiles.Count -gt 0) {
        $fileArgs = ($changedTsFiles | ForEach-Object { "--file `"$_`"" }) -join " "

        if ($errorCount -gt 0) {
            Write-Host "  -> Asking Aider to fix $errorCount TypeScript errors..." -ForegroundColor Yellow
            $errContent = Get-Content (Join-Path $ProjectDir "scripts\ts-errors.txt") -Raw
            $prompt = "Fix these TypeScript errors. Only fix the errors, do not change anything else: $errContent"
            $cmd = "aider --model ollama/qwen3-coder:30b --yes --no-git --message `"$prompt`" $fileArgs"
            Write-Host "  -> Running Aider..." -ForegroundColor DarkGray
            Invoke-Expression $cmd 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

            $recheck = @(npx tsc --noEmit 2>&1 | Select-String "error TS")
            if ($recheck.Count -eq 0) {
                Write-Ok "All TypeScript errors fixed by Aider!"
            } else {
                Write-Warn "$($recheck.Count) errors remain after Aider fix"
            }
        } else {
            Write-Host "  -> Asking Aider for quick code review..." -ForegroundColor Yellow
            $prompt = "Do a quick review of the recently changed code. Only fix clear bugs. Do NOT refactor or change style. If everything looks good, make no changes."
            $cmd = "aider --model ollama/qwen3-coder:30b --yes --no-git --message `"$prompt`" $fileArgs"
            Invoke-Expression $cmd 2>&1 | Out-Null
            Write-Ok "Code review complete"
        }
    } else {
        Write-Ok "No changed TypeScript files to review"
    }
} elseif (-not $DeployOnly) {
    Write-Step "3" "Aider AI review - SKIPPED (Ollama not running)"
}

if ($ReviewOnly) {
    Write-Host ""
    Write-Host "=== Review complete! (ReviewOnly mode) ===" -ForegroundColor Green
    exit 0
}

# ============================================
# PHASE 4: GIT COMMIT & PUSH TO GITHUB
# ============================================

Write-Step "4" "Git commit & push to GitHub"

$gitStatus2 = git status --porcelain
if ($gitStatus2) {
    git add -A 2>&1 | Out-Null
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm"
    $commitMsg = "chore: pipeline auto-review $ts"
    git commit -m $commitMsg 2>&1 | Out-Null
    Write-Ok "Committed: $commitMsg"

    git push origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "Pushed to GitHub (main)"
    } else {
        Write-Fail "Failed to push to GitHub"
    }
} else {
    Write-Ok "Nothing to commit"
}

# ============================================
# PHASE 5: DEPLOY TO VPS
# ============================================

Write-Step "5" "Deploy to VPS (bpr.rehab)"

if (-not $SkipConfirm) {
    $confirm = Read-Host "  Deploy to production? (y/n)"
    if ($confirm -ne "y") {
        Write-Warn "Deploy cancelled by user"
        exit 0
    }
}

Write-Host "  -> Syncing files to VPS..." -ForegroundColor Yellow

$filesToSync = @(git diff --name-only HEAD~1 HEAD 2>$null)
if ($filesToSync.Count -gt 0) {
    foreach ($file in $filesToSync) {
        if (Test-Path $file) {
            $remotePath = "$VPSPath/$file" -replace '\\','/'
            $remoteDir = Split-Path $remotePath -Parent
            ssh $VPS "mkdir -p $remoteDir" 2>$null
            scp $file "${VPS}:${remotePath}" 2>$null
        }
    }
    Write-Ok "Synced $($filesToSync.Count) file(s) to VPS"
} else {
    Write-Host "  -> Full sync of key directories..." -ForegroundColor Yellow
    scp -r app/ "${VPS}:${VPSPath}/app/" 2>$null
    scp -r components/ "${VPS}:${VPSPath}/components/" 2>$null
    scp -r lib/ "${VPS}:${VPSPath}/lib/" 2>$null
    Write-Ok "Full sync complete"
}

Write-Host "  -> Building on VPS..." -ForegroundColor Yellow
$deployResult = ssh $VPS "cd $VPSPath && bash deploy.sh" 2>&1
$deployText = $deployResult | Out-String
if ($deployText -match "Deploy complete") {
    Write-Ok "VPS build and restart successful!"
} else {
    Write-Fail "VPS deploy may have issues - check manually"
    $deployResult | Select-Object -Last 5 | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}

# ============================================
# DONE
# ============================================

$elapsed = (Get-Date) - $startTime
$sec = [math]::Round($elapsed.TotalSeconds)
Write-Host ""
Write-Host "=== Pipeline complete! (${sec}s) ===" -ForegroundColor Green
$finishTime = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content $LogFile "=== Pipeline finished $finishTime (${sec}s) ==="
