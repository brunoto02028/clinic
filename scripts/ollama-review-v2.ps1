#!/usr/bin/env pwsh
# Ollama direct API review v2 - fixed JSON encoding
# READ-ONLY: generates report, changes nothing

$ProjectDir = "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
$ReportFile = Join-Path $ProjectDir "scripts\review-report.md"
$OllamaUrl = "http://localhost:11434/api/generate"
$Model = "qwen3-coder:30b"

Set-Location $ProjectDir

$files = @(
    "middleware.ts",
    "lib/auth-options.ts",
    "app/admin/body-assessments/page.tsx",
    "app/dashboard/body-assessments/page.tsx",
    "app/dashboard/body-assessments/body-assessment/page.tsx"
)

$systemPrompt = "You are a senior code reviewer. Review the code and report ONLY: 1) BUGS with line numbers 2) SECURITY issues 3) CRITICAL performance problems 4) Rating X/10. Be concise, max 15 lines. Skip style opinions."

@"
# BPR.REHAB - Code Review Report (v2)
- **Date:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
- **Reviewer:** Ollama $Model (local, offline)
- **Mode:** READ-ONLY (no changes applied)

"@ | Out-File $ReportFile -Encoding utf8

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Ollama Code Review v2" -ForegroundColor Cyan
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
    
    $lineCount = @(Get-Content $file).Count
    
    # For large files, take strategic sections
    if ($lineCount -gt 400) {
        $allLines = Get-Content $file
        $head = ($allLines | Select-Object -First 300) -join "`n"
        $tail = ($allLines | Select-Object -Last 100) -join "`n"
        $code = $head + "`n// ... TRUNCATED ($lineCount total lines) ...`n" + $tail
        $truncNote = " (truncated to ~400 lines)"
    } else {
        $code = Get-Content $file -Raw
        $truncNote = ""
    }
    
    Write-Host "  [$current/$($files.Count)] $file ($lineCount lines$truncNote) ..." -ForegroundColor Yellow -NoNewline
    
    $startFile = Get-Date
    
    # Use chat API instead of generate - better JSON handling
    $chatUrl = "http://localhost:11434/api/chat"
    
    $messages = @(
        @{
            role = "system"
            content = $systemPrompt
        },
        @{
            role = "user"
            content = "Review this file: $file`n`n$code"
        }
    )
    
    $bodyObj = @{
        model = $Model
        messages = $messages
        stream = $false
        options = @{
            temperature = 0.3
            num_predict = 600
        }
    }
    
    # Use .NET serialization for proper escaping
    $jsonBody = [System.Text.Json.JsonSerializer]::Serialize($bodyObj)
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
    
    try {
        $response = Invoke-RestMethod -Uri $chatUrl -Method POST -Body $bodyBytes -ContentType "application/json; charset=utf-8" -TimeoutSec 600
        $review = $response.message.content
    } catch {
        $review = "ERROR: $($_.Exception.Message)"
    }
    
    $elapsed = [math]::Round(((Get-Date) - $startFile).TotalSeconds)
    Write-Host " done (${elapsed}s)" -ForegroundColor Green
    
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
- **Zero cloud tokens used**
"@ | Out-File $ReportFile -Append -Encoding utf8

Write-Host ""
Write-Host "=== Done! (${totalElapsed}s) ===" -ForegroundColor Green
Write-Host "Report: scripts\review-report.md" -ForegroundColor Cyan
