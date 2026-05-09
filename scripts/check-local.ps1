#!/usr/bin/env pwsh
# تشغيل كل الفحوصات محلياً قبل الـ push — نفس ما يعمله CI
# الاستخدام: pwsh scripts/check-local.ps1

param(
  [switch]$SkipTests,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot | Split-Path

Set-Location $root

function Step([string]$name, [scriptblock]$block) {
  Write-Host "`n==> $name" -ForegroundColor Cyan
  & $block
  if ($LASTEXITCODE -ne 0) {
    Write-Host "FAILED: $name" -ForegroundColor Red
    exit 1
  }
  Write-Host "OK: $name" -ForegroundColor Green
}

Step "pnpm install" {
  pnpm install --frozen-lockfile
}

Step "TypeScript (libs)" {
  pnpm run typecheck:libs
}

Step "TypeScript (sawtracker)" {
  Set-Location "$root/artifacts/sawtracker"
  pnpm run typecheck
  Set-Location $root
}

if (-not $SkipTests) {
  Step "Tests (vitest)" {
    Set-Location "$root/artifacts/sawtracker"
    pnpm exec vitest run --reporter=verbose
    Set-Location $root
  }
}

if (-not $SkipBuild) {
  Step "Build (sawtracker)" {
    Set-Location "$root/artifacts/sawtracker"
    $env:VITE_SUPABASE_URL = "https://placeholder.supabase.co"
    $env:VITE_SUPABASE_ANON_KEY = "placeholder-key"
    pnpm run build
    Set-Location $root
  }
}

Write-Host "`nكل الفحوصات نجحت - جاهز للـ push" -ForegroundColor Green
