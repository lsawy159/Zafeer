# =============================================================
#   GitHub Upload Script for Zafeer
#   Repo: https://github.com/lsawy159/Zafeer.git
# =============================================================

$ErrorActionPreference = 'Stop'
$ProjectRoot = $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "=============================================="
Write-Host "  Zafeer - GitHub Upload"
Write-Host "=============================================="
Write-Host ""

# 1) Check git
Write-Host "[1/5] Checking git..."
try {
    git --version | Out-Null
    Write-Host "      OK"
} catch {
    Write-Host "      git not installed. Get it from https://git-scm.com"
    exit 1
}

# 2) Remove old .git if exists
Write-Host ""
Write-Host "[2/5] Cleaning old .git..."
$OldGit = Join-Path $ProjectRoot '.git'
if (Test-Path $OldGit) {
    Get-ChildItem -Path $OldGit -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
        try { $_.Attributes = 'Normal' } catch {}
    }
    Remove-Item -Path $OldGit -Recurse -Force
    Write-Host "      Removed"
} else {
    Write-Host "      No old .git, OK"
}

# 3) git init + commit
Write-Host ""
Write-Host "[3/5] git init + commit..."

git init -b main | Out-Null
Write-Host "      init OK"

$gitName  = git config user.name
$gitEmail = git config user.email
if (-not $gitName -or -not $gitEmail) {
    Write-Host ""
    Write-Host "      WARNING: git user.name/email not set."
    Write-Host "      Run these once, then re-run this script:"
    Write-Host '        git config --global user.name  "Your Name"'
    Write-Host '        git config --global user.email "you@example.com"'
    Write-Host ""
    exit 1
}

git add . | Out-Null
Write-Host "      add OK"

git commit -m "chore: initial commit" | Out-Null
Write-Host "      commit OK"

# 4) Add remote
Write-Host ""
Write-Host "[4/5] Adding remote..."
$RemoteUrl = 'https://github.com/lsawy159/Zafeer.git'
git remote remove origin 2>$null
git remote add origin $RemoteUrl
Write-Host "      remote = $RemoteUrl"

# 5) Push
Write-Host ""
Write-Host "[5/5] Pushing to GitHub..."
Write-Host "      (You may be asked to login)"
Write-Host ""

try {
    git push -u origin main --force
    Write-Host ""
    Write-Host "=============================================="
    Write-Host "  SUCCESS! Open:"
    Write-Host "  $RemoteUrl"
    Write-Host "=============================================="
} catch {
    Write-Host ""
    Write-Host "=============================================="
    Write-Host "  Push failed."
    Write-Host "=============================================="
    Write-Host ""
    Write-Host "Possible reasons:"
    Write-Host "  1) Repo not created yet on GitHub."
    Write-Host "     Open: https://github.com/new   Name: Zafeer"
    Write-Host "  2) Need to login (GitHub Desktop or PAT token)."
    Write-Host ""
    Write-Host "After fixing, run manually:"
    Write-Host "  git push -u origin main"
}
