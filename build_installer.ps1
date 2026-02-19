
# --- ENGRAM BUILD SCRIPT (ROBUST) ---
$ErrorActionPreference = "Stop"
$ZipName = "engram-v1.2.1.zip"
$ProjectDir = "engram_build_manual"

# Helper to check for errors
function Check-Success {
    param([string]$StepName)
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ $StepName FAILED! Fix the errors above and try again."
        exit 1
    }
}

Write-Host "🚀 STARTING BUILD..." -ForegroundColor Green

# 1. Validation
if (-not (Test-Path $ZipName)) {
    Write-Error "❌ File '$ZipName' not found! Please place the zip file in this folder."
    return
}

# 2. Cleanup
if (Test-Path $ProjectDir) {
    Write-Host "🧹 Cleaning old build folder..." -ForegroundColor Yellow
    Remove-Item $ProjectDir -Recurse -Force
}

# 3. Extract
Write-Host "📦 Extracting..." -ForegroundColor Cyan
Expand-Archive -Path $ZipName -DestinationPath $ProjectDir -Force

# 4. Enter Directory
Set-Location $ProjectDir
# Handle nested folder from zip extraction
if ((Get-ChildItem -Directory).Count -eq 1 -and -not (Test-Path "package.json")) {
    $SubDir = Get-ChildItem -Directory | Select-Object -First 1
    Set-Location $SubDir.Name
}
Write-Host "📂 Working in: $(Get-Location)" -ForegroundColor Gray

# 5. Install Dependencies (Uses package.json)
Write-Host "⬇️  Installing Dependencies..." -ForegroundColor Cyan
# We use 'ci' (Clean Install) if package-lock exists for reliability, otherwise install
if (Test-Path "package-lock.json") {
    cmd /c "npm ci"
} else {
    cmd /c "npm install"
}
Check-Success "NPM Install"

# 6. Build Web App
Write-Host "🔨 Building Web Assets..." -ForegroundColor Cyan
cmd /c "npm run build"
Check-Success "Vite Build"

# 6b. Verify Dist Exists
if (-not (Test-Path "dist\index.html")) {
    Write-Error "❌ Build failed: 'dist\index.html' was not created. The build step encountered errors."
    exit 1
}

# 7. Add Android
Write-Host "🤖 Adding Android Platform..." -ForegroundColor Cyan
if (-not (Test-Path "android")) {
    cmd /c "npx cap add android"
    Check-Success "Capacitor Add Android"
}

# 8. Fix Icons
Write-Host "🎨 Generating Icons..." -ForegroundColor Magenta
if (-not (Test-Path "assets")) { New-Item -ItemType Directory -Force -Path "assets" | Out-Null }

$LogoPath = "public\brand\engram_logo\engram_logo_512.png"
if (Test-Path $LogoPath) {
    Copy-Item $LogoPath "assets\icon.png" -Force
    Copy-Item $LogoPath "assets\splash.png" -Force
    Copy-Item $LogoPath "assets\splash-dark.png" -Force
    
    # Generate resources
    cmd /c "npx capacitor-assets generate --android"
} else {
    Write-Warning "⚠️ Logo not found at $LogoPath. Using default icons."
}

# 9. Sync
Write-Host "🔄 Syncing to Android..." -ForegroundColor Cyan
cmd /c "npx cap sync"
Check-Success "Capacitor Sync"

# 10. Launch
Write-Host "🚀 Launching Android Studio..." -ForegroundColor Green
Write-Host "---------------------------------------------------"
Write-Host "1. Wait for Gradle Sync to finish (bottom right)."
Write-Host "2. Click the Green Play Button '▶' to run."
Write-Host "---------------------------------------------------"

cmd /c "npx cap open android"
