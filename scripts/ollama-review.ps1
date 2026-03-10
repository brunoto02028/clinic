#!/usr/bin/env pwsh
# Direct Ollama API review - faster than Aider, no overhead
# READ-ONLY: generates report, changes nothing

$ProjectDir = "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
$ReportFile = Join-Path $ProjectDir "scripts\review-report.md"
$OllamaUrl = "http://localhost:11434/api/generate"
$Model = "qwen3-coder:30b"

Set-Location $ProjectDir

# Files to review (smaller ones first)
$files = @(
    "middleware.ts",
    "lib/auth-options.ts",
    "lib/get-effective-user.ts",
    "app/api/admin/body-assessments/[id]/route.ts",
    "app/api/body-assessments/[id]/report-pdf/route.ts",
    "components/body-assessment/body-metrics-tab.tsx",
    "app/dashboard/body-assessments/page.tsx",
    "app/admin/body-assessments/page.tsx"
)

$prompt = @"
Review this Next.js/TypeScript file from a clinical system. Be CONCISE. Report ONLY:
1. BUGS (with line numbers if possible)
2. SECURITY issues
3. CRITICAL performance problems
4. Rating /10

Skip style opinions. If the file is fine, just say "No issues found. Rating: X/10".
Respond in English. Be brief - max 15 lines per file.
"@

# Start report
@"
# BPR.REHAB - Code Review Report
- **Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Reviewer:** Ollama $Model (local, offline)
- **Mode:** READ-ONLY (no changes applied)
- **Files:** $($files.Count)

"@ | Out-File $ReportFile -Encoding utf8

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ollama Code Review (direct API)" -ForegroundColor Cyan
Write-Host "  Model: $Model" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$totalStart = Get-Date
$current = 0

foreach ($file in $files) {
    $current++
    
    if (-not (Test-Path $file)) {
        Write-Host "  [$current/$($files.Count)] SKIP $file (not found)" -ForegroundColor DarkGray
        continue
    }
    
    $fileSize = (Get-Item $file).Length
    $lineCount = @(Get-Content $file).Count
    
    # For very large files (>500 lines), take first 400 + last 100 lines
    if ($lineCount -gt 500) {
        $allLines = Get-Content $file
        $head = $allLines | Select-Object -First 400
        $tail = $allLines | Select-Object -Last 100
        $code = ($head -join "`n") + "`n`n// ... [TRUNCATED: $lineCount total lines, showing first 400 + last 100] ...`n`n" + ($tail -join "`n")
        $truncNote = " (truncated: $lineCount lines -> 500)"
    } else {
        $code = Get-Content $file -Raw
        $truncNote = " ($lineCount lines)"
    }
    
    Write-Host "  [$current/$($files.Count)] Reviewing $file$truncNote ..." -ForegroundColor Yellow -NoNewline
    
    $startFile = Get-Date
    
    # Call Ollama API directly
    $body = @{
        model = $Model
        prompt = "FILE: $file`n`n$prompt`n`n``````typescript`n$code`n```````n`nYour review:"
        stream = $false
        options = @{
            temperature = 0.3
            num_predict = 500
        }
    } | ConvertTo-Json -Depth 5
    
    try {
        $response = Invoke-RestMethod -Uri $OllamaUrl -Method POST -Body $body -ContentType "application/json" -TimeoutSec 300
        $review = $response.response
    } catch {
        $review = "ERROR: Failed to get response from Ollama - $($_.Exception.Message)"
    }
    
    $elapsed = [math]::Round(((Get-Date) - $startFile).TotalSeconds)
    Write-Host " done (${elapsed}s)" -ForegroundColor Green
    
    # Append to report
    @"

---
## $file
- **Lines:** $lineCount | **Time:** ${elapsed}s
$review

"@ | Out-File $ReportFile -Append -Encoding utf8
}

$totalElapsed = [math]::Round(((Get-Date) - $totalStart).TotalSeconds)

@"

---
## Summary
- **Total time:** ${totalElapsed}s
- **Files reviewed:** $($files.Count)
- **Model:** $Model
- **All processing done locally (zero cloud tokens used)**
"@ | Out-File $ReportFile -Append -Encoding utf8

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Review complete! (${totalElapsed}s total)" -ForegroundColor Green
Write-Host "  Report: scripts\review-report.md" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Green
