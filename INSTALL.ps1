# Discord Bot Auto-Installer for Windows
# Run as Administrator: Right-click → Run with PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Discord Bot - Auto Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[ERROR] This script must run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click this file and select 'Run with PowerShell (Admin)'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "[INFO] Running as Administrator - OK" -ForegroundColor Green
Write-Host ""

# Function to check if command exists
function Test-Command {
    param($cmdname)
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

# Function to download file
function Download-File {
    param($url, $output)
    try {
        Write-Host "[DOWNLOAD] $output" -ForegroundColor Cyan
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host "[SUCCESS] Downloaded: $output" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "[ERROR] Failed to download: $_" -ForegroundColor Red
        return $false
    }
}

# 1. Check Node.js
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 1: Checking Node.js..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Command node) {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Download the LTS version and restart this script." -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# 2. Install/Check MongoDB
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 2: Installing MongoDB..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongoService) {
    Write-Host "[OK] MongoDB service found" -ForegroundColor Green
    if ($mongoService.Status -eq "Running") {
        Write-Host "[OK] MongoDB is running" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Starting MongoDB service..." -ForegroundColor Cyan
        Start-Service MongoDB
        Start-Sleep -Seconds 2
        Write-Host "[OK] MongoDB started" -ForegroundColor Green
    }
} else {
    Write-Host "[INFO] MongoDB not found - Installing via Chocolatey..." -ForegroundColor Cyan
    
    # Check if Chocolatey is installed
    if (-not (Test-Command choco)) {
        Write-Host "[INFO] Installing Chocolatey package manager..." -ForegroundColor Cyan
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refresh environment
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "[OK] Chocolatey installed" -ForegroundColor Green
    }
    
    Write-Host "[INFO] Installing MongoDB Community Server..." -ForegroundColor Cyan
    choco install mongodb -y
    
    # Wait for service to initialize
    Start-Sleep -Seconds 5
    
    # Start MongoDB service
    $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
    if ($mongoService) {
        Start-Service MongoDB -ErrorAction SilentlyContinue
        Write-Host "[OK] MongoDB installed and started" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] MongoDB installed but service not detected" -ForegroundColor Yellow
        Write-Host "You may need to manually start MongoDB or reinstall from:" -ForegroundColor Yellow
        Write-Host "https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    }
}
Write-Host ""

# 3. Install yt-dlp
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 3: Installing yt-dlp..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Command yt-dlp) {
    $ytdlpVersion = yt-dlp --version
    Write-Host "[OK] yt-dlp already installed: $ytdlpVersion" -ForegroundColor Green
} else {
    Write-Host "[INFO] Downloading yt-dlp..." -ForegroundColor Cyan
    $ytdlpPath = "C:\Windows\yt-dlp.exe"
    $downloaded = Download-File "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" $ytdlpPath
    
    if ($downloaded) {
        Write-Host "[OK] yt-dlp installed to C:\Windows\" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to install yt-dlp" -ForegroundColor Red
        Write-Host "Download manually from: https://github.com/yt-dlp/yt-dlp/releases" -ForegroundColor Yellow
    }
}
Write-Host ""

# 4. Install FFmpeg
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 4: Installing FFmpeg..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Command ffmpeg) {
    Write-Host "[OK] FFmpeg already installed" -ForegroundColor Green
    ffmpeg -version | Select-Object -First 1
} else {
    Write-Host "[INFO] Installing FFmpeg via Chocolatey..." -ForegroundColor Cyan
    choco install ffmpeg -y
    
    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    
    if (Test-Command ffmpeg) {
        Write-Host "[OK] FFmpeg installed successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] FFmpeg installation may require restarting your PC" -ForegroundColor Yellow
    }
}
Write-Host ""

# 5. Install Node.js dependencies
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 5: Installing Node.js Dependencies..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

$botDir = $PSScriptRoot
if (Test-Path "$botDir\package.json") {
    Write-Host "[INFO] Installing npm packages (this may take 2-5 minutes)..." -ForegroundColor Cyan
    Set-Location $botDir
    
    # Clean install
    if (Test-Path "$botDir\node_modules") {
        Write-Host "[INFO] Cleaning old node_modules..." -ForegroundColor Cyan
    }
    
    npm install --no-audit --prefer-offline
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] npm packages installed successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] npm install failed" -ForegroundColor Red
    }
} else {
    Write-Host "[ERROR] package.json not found in current directory" -ForegroundColor Red
}
Write-Host ""

# 6. Verify .env file
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 6: Checking Configuration..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Path "$botDir\.env") {
    Write-Host "[OK] .env file found" -ForegroundColor Green
    
    # Check if DISCORD_TOKEN is set
    $envContent = Get-Content "$botDir\.env" -Raw
    if ($envContent -match "DISCORD_TOKEN=.{50,}") {
        Write-Host "[OK] DISCORD_TOKEN appears to be set" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] DISCORD_TOKEN may not be configured" -ForegroundColor Yellow
        Write-Host "Edit .env file and add your Discord bot token" -ForegroundColor Yellow
    }
} else {
    if (Test-Path "$botDir\.env.example") {
        Write-Host "[INFO] Creating .env from .env.example..." -ForegroundColor Cyan
        Copy-Item "$botDir\.env.example" "$botDir\.env"
        Write-Host "[WARNING] You MUST edit .env file with your bot token!" -ForegroundColor Yellow
        Write-Host "File location: $botDir\.env" -ForegroundColor Yellow
    } else {
        Write-Host "[ERROR] No .env or .env.example file found!" -ForegroundColor Red
    }
}
Write-Host ""

# 7. Test MongoDB connection
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Step 7: Testing MongoDB Connection..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow

if (Test-Command mongosh) {
    Write-Host "[INFO] Testing MongoDB connection..." -ForegroundColor Cyan
    $mongoTest = & mongosh --eval "db.version()" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] MongoDB connection successful" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] MongoDB connection test inconclusive" -ForegroundColor Yellow
    }
} else {
    Write-Host "[INFO] mongosh not found - skipping connection test" -ForegroundColor Cyan
    Write-Host "MongoDB should still work with the bot" -ForegroundColor Cyan
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Edit .env file with your Discord bot token" -ForegroundColor White
Write-Host "   - Get token from: https://discord.com/developers/applications" -ForegroundColor Gray
Write-Host "   - File: $botDir\.env" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Enable bot intents in Discord Developer Portal:" -ForegroundColor White
Write-Host "   - SERVER MEMBERS INTENT" -ForegroundColor Gray
Write-Host "   - MESSAGE CONTENT INTENT" -ForegroundColor Gray
Write-Host "   - PRESENCE INTENT" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start the bot:" -ForegroundColor White
Write-Host "   node dashboard.js" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Access dashboard:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "For detailed instructions, see README.md" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to open .env file
$openEnv = Read-Host "Do you want to open the .env file now? (y/n)"
if ($openEnv -eq "y" -or $openEnv -eq "Y") {
    if (Test-Path "$botDir\.env") {
        notepad "$botDir\.env"
    }
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
