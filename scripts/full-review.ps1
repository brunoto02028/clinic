#!/usr/bin/env pwsh
# Full code review using Ollama/Aider - READ ONLY, no edits
# Output goes to scripts/review-report.md

$ProjectDir = "c:\Bruno Projetos\Clinic\New Clinc\bruno_clinical_system\nextjs_space"
$ReportFile = Join-Path $ProjectDir "scripts\review-report.md"

Set-Location $ProjectDir

# Clear previous report
"# BPR.REHAB - Code Review Report" | Out-File $ReportFile -Encoding utf8
"Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $ReportFile -Append -Encoding utf8
"Reviewer: Ollama qwen3-coder:30b (local)" | Out-File $ReportFile -Append -Encoding utf8
"Mode: READ-ONLY (no changes applied)" | Out-File $ReportFile -Append -Encoding utf8
"" | Out-File $ReportFile -Append -Encoding utf8

# Files to review
$files = @(
    "app/admin/body-assessments/page.tsx",
    "components/body-assessment/body-metrics-tab.tsx",
    "app/api/admin/body-assessments/[id]/route.ts",
    "app/api/body-assessments/[id]/report-pdf/route.ts",
    "app/dashboard/body-assessments/page.tsx",
    "middleware.ts",
    "lib/auth-options.ts"
)

$prompt = @"
You are reviewing a Next.js clinical system (bpr.rehab). Analyze the code and produce a structured report in this format:

## [filename]
### Bugs Found
- List any bugs with line references
### Security Issues
- Any security concerns
### Performance Issues  
- Any performance problems
### Code Quality
- Improvements that would help maintainability
### Rating: X/10

Be concise. Only report real issues, not style preferences. If a file looks good, say so briefly.
Do NOT make any changes to the code. This is a read-only review.
"@

$totalFiles = $files.Count
$current = 0

foreach ($file in $files) {
    $current++
    if (-not (Test-Path $file)) {
        Write-Host "  [$current/$totalFiles] SKIP $file (not found)" -ForegroundColor DarkGray
        continue
    }
    
    Write-Host "  [$current/$totalFiles] Reviewing $file ..." -ForegroundColor Yellow
    
    $startFile = Get-Date
    
    # Run aider in message mode with --no-git --dry-run (no changes)
    $output = aider --model ollama/qwen3-coder:30b --no-git --no-auto-commits --message "$prompt" --file "$file" --yes 2>&1 | Out-String
    
    $elapsed = [math]::Round(((Get-Date) - $startFile).TotalSeconds)
    
    # Extract just the AI response (skip aider boilerplate)
    $lines = $output -split "`n"
    $capture = $false
    $review = @()
    foreach ($line in $lines) {
        if ($line -match "^##|^###|^-|^Bugs|^Security|^Performance|^Code|^Rating|^\*") {
            $capture = $true
        }
        if ($capture) {
            $review += $line
        }
    }
    
    # If no structured output captured, save raw output
    if ($review.Count -eq 0) {
        $review = $lines | Where-Object { 
            $_ -notmatch "^Aider|^Model:|^Git repo|^Warning|^Added|^https://|^You can|^Note:" -and $_.Trim() -ne ""
        }
    }
    
    $reviewText = $review -join "`n"
    
    # Append to report
    "" | Out-File $ReportFile -Append -Encoding utf8
    "---" | Out-File $ReportFile -Append -Encoding utf8
    "## $file (${elapsed}s)" | Out-File $ReportFile -Append -Encoding utf8
    "" | Out-File $ReportFile -Append -Encoding utf8
    $reviewText | Out-File $ReportFile -Append -Encoding utf8
    
    Write-Host "  [$current/$totalFiles] Done $file (${elapsed}s)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Review complete! ===" -ForegroundColor Green
Write-Host "Report saved to: scripts\review-report.md" -ForegroundColor Cyan
