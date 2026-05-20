#!/usr/bin/env pwsh
# Gate G-FINAL: تحقق من غياب كل refs legacy (sawtracker/SawTracker/MinMax) من الأماكن الحية
# الاستخدام: pwsh scripts/check-rename.ps1

$forbidden = @(
  "artifacts/zafeer/src",
  "lib/",
  "supabase/",
  ".github/workflows/",
  "e2e/",
  "package.json",
  "vercel.json",
  ".lighthouserc.js",
  ".dockerignore",
  "pnpm-workspace.yaml",
  "pnpm-lock.yaml",
  "README.md",
  "CONTRIBUTING.md",
  "RUNBOOK.md"
)

$patterns = @("sawtracker", "SawTracker", "MinMax")
$failed = $false

foreach ($path in $forbidden) {
  foreach ($pattern in $patterns) {
    $hits = git grep -i $pattern -- $path 2>$null
    if ($hits) {
      Write-Host "FAIL: legacy ref '$pattern' in $path" -ForegroundColor Red
      $hits | ForEach-Object { Write-Host "  $_" }
      $failed = $true
    }
  }
}

if ($failed) {
  Write-Host "`nG-FINAL: FAIL — legacy refs موجودة في أماكن محظورة" -ForegroundColor Red
  exit 1
}

Write-Host "G-FINAL: PASS — لا legacy refs في الأماكن الحية" -ForegroundColor Green
