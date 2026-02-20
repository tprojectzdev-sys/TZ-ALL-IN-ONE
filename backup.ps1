# TZ PRO - Automated Database Backup Script
# Creates timestamped backups and maintains last 7 days

Write-Host "`n💾 TZ PRO Database Backup" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan

# Configuration
$backupDir = "$PSScriptRoot\backups"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupPath = "$backupDir\backup_$timestamp"
$mongoUri = "mongodb://localhost:27017"
$databaseName = "tzpro"

# Load .env file if exists
if (Test-Path "$PSScriptRoot\.env") {
    Get-Content "$PSScriptRoot\.env" | ForEach-Object {
        if ($_ -match '^MONGODB_URI=(.+)$') {
            $mongoUri = $matches[1]
            # Extract database name from URI
            if ($mongoUri -match '/([^/?]+)(\?|$)') {
                $databaseName = $matches[1]
            }
        }
    }
}

# Create backup directory
if (!(Test-Path $backupDir)) {
    New-Item -ItemType Directory -Path $backupDir | Out-Null
    Write-Host "✅ Created backup directory" -ForegroundColor Green
}

# Check if mongodump is available
$mongodumpPath = Get-Command mongodump -ErrorAction SilentlyContinue
if (!$mongodumpPath) {
    Write-Host "⚠️  mongodump not found!" -ForegroundColor Yellow
    Write-Host "`nAttempting manual backup using MongoDB Node.js driver...`n" -ForegroundColor Yellow
    
    # Fallback: Create a simple backup using Node.js
    $nodeScript = @"
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const mongoUri = '$($mongoUri)';
const backupPath = '$($backupPath)';

if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
}

mongoose.connect(mongoUri).then(async () => {
    console.log('✅ Connected to MongoDB');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    for (const collInfo of collections) {
        const collName = collInfo.name;
        const data = await db.collection(collName).find({}).toArray();
        fs.writeFileSync(
            path.join(backupPath, collName + '.json'),
            JSON.stringify(data, null, 2)
        );
        console.log('✅ Backed up: ' + collName + ' (' + data.length + ' documents)');
    }
    
    console.log('\n✅ Backup complete: $backupPath');
    process.exit(0);
}).catch(err => {
    console.error('❌ Backup failed:', err.message);
    process.exit(1);
});
"@
    
    $nodeScript | Out-File -FilePath "$PSScriptRoot\temp_backup.js" -Encoding UTF8
    node "$PSScriptRoot\temp_backup.js"
    Remove-Item "$PSScriptRoot\temp_backup.js" -ErrorAction SilentlyContinue
    
} else {
    # Use mongodump
    Write-Host "📦 Creating backup of '$databaseName'...`n" -ForegroundColor Yellow
    
    try {
        & mongodump --uri="$mongoUri" --db="$databaseName" --out="$backupPath" 2>&1 | ForEach-Object {
            Write-Host $_ -ForegroundColor Gray
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Backup successful!" -ForegroundColor Green
            Write-Host "📁 Location: $backupPath" -ForegroundColor Cyan
        } else {
            Write-Host "`n❌ Backup failed!" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "`n❌ Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Cleanup: Keep only last 7 backups
Write-Host "`n🧹 Cleaning old backups..." -ForegroundColor Yellow
$allBackups = Get-ChildItem -Path $backupDir -Directory | Sort-Object CreationTime -Descending
$backupsToKeep = 7

if ($allBackups.Count -gt $backupsToKeep) {
    $backupsToDelete = $allBackups | Select-Object -Skip $backupsToKeep
    foreach ($backup in $backupsToDelete) {
        Remove-Item -Path $backup.FullName -Recurse -Force
        Write-Host "  🗑️  Deleted old backup: $($backup.Name)" -ForegroundColor Gray
    }
    Write-Host "✅ Kept last $backupsToKeep backups" -ForegroundColor Green
} else {
    Write-Host "ℹ️  No cleanup needed (only $($allBackups.Count) backups)" -ForegroundColor Gray
}

# Summary
Write-Host "`n═══════════════════════════════════════" -ForegroundColor Cyan
Write-Host "📊 Backup Summary:" -ForegroundColor Cyan
Write-Host "  Total backups: $($allBackups.Count)" -ForegroundColor White
Write-Host "  Latest backup: backup_$timestamp" -ForegroundColor White
Write-Host "  Size: $([math]::Round((Get-ChildItem -Path $backupPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB, 2)) MB" -ForegroundColor White
Write-Host "═══════════════════════════════════════`n" -ForegroundColor Cyan
