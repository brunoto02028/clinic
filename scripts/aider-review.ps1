#!/usr/bin/env pwsh
# ═══════════════════════════════════════════
# Quick Aider Review — reviews changed files
# Usage: .\scripts\aider-review.ps1
# ═══════════════════════════════════════════

$ProjectDir = "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
Set-Location $ProjectDir

Write-Host "`n  Aider Quick Review" -ForegroundColor Cyan
Write-Host "  ─────────────────────`n" -ForegroundColor DarkGray

# Check Ollama
try {
    Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -TimeoutSec 3 -ErrorAction Stop | Out-Null
} catch {
    Write-Host "  ✗ Ollama is not running! Start Ollama first." -ForegroundColor Red
    exit 1
}

# Get changed files
$changedFiles = git diff --name-only HEAD 2>$null | Where-Object { $_ -match '\.(tsx?|ts)$' }
if (-not $changedFiles) {
    $changedFiles = git diff --name-only --cached 2>$null | Where-Object { $_ -match '\.(tsx?|ts)$' }
}
if (-not $changedFiles) {
    $changedFiles = git diff --name-only HEAD~1 HEAD 2>$null | Where-Object { $_ -match '\.(tsx?|ts)$' }
}

if (-not $changedFiles -or $changedFiles.Count -eq 0) {
    Write-Host "  No changed TypeScript files to review." -ForegroundColor Yellow
    exit 0
}

Write-Host "  Files to review:" -ForegroundColor White
foreach ($f in $changedFiles) {
    Write-Host "    → $f" -ForegroundColor DarkGray
}
Write-Host ""

# Build file args
$fileArgs = ($changedFiles | ForEach-Object { "--file `"$_`"" }) -join " "

# Run Aider interactively so user can see and approve changes
$cmd = "aider --model ollama/qwen3-coder:30b $fileArgs"
Write-Host "  Starting Aider...`n" -ForegroundColor Green
Invoke-Expression $cmd
