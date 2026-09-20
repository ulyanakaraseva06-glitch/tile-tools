$ErrorActionPreference = 'Stop'

$tileToolsRoot = Split-Path -Parent $PSScriptRoot
$desktopRoot = Split-Path -Parent $tileToolsRoot
$buildRoot = Join-Path $tileToolsRoot 'build-cache'
$pdfSource = Join-Path $desktopRoot 'plitka-pdf'
$calculatorSource = Join-Path $desktopRoot 'project_vilray_studio'
$pdfStage = Join-Path $buildRoot 'plitka-pdf'
$calculatorStage = Join-Path $buildRoot 'project_vilray_studio'
$pdfOutput = Join-Path $tileToolsRoot 'services\pdf'
$calculatorOutput = Join-Path $tileToolsRoot 'services\calculator'

if (-not $buildRoot.StartsWith($tileToolsRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unsafe build-cache path.'
}
if (Test-Path -LiteralPath $buildRoot) {
    Remove-Item -LiteralPath $buildRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $pdfStage, $calculatorStage | Out-Null

function Copy-SourceSnapshot {
    param([string]$Source, [string]$Destination)
    Get-ChildItem -LiteralPath $Source -Force | Where-Object { $_.Name -notin @('node_modules', 'dist', '.git') } | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $Destination -Recurse -Force
    }
    New-Item -ItemType Junction -Path (Join-Path $Destination 'node_modules') -Target (Join-Path $Source 'node_modules') | Out-Null
}

Copy-SourceSnapshot -Source $pdfSource -Destination $pdfStage
Copy-SourceSnapshot -Source $calculatorSource -Destination $calculatorStage
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'vite.calculator.config.ts') -Destination (Join-Path $calculatorStage 'vite.config.ts') -Force

Write-Host 'Building unchanged plitka-pdf snapshot...'
Push-Location $pdfStage
try {
    & (Join-Path $pdfSource 'node_modules\.bin\vite.cmd') build --configLoader=runner --base=/services/pdf/ --outDir=$pdfOutput --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw 'plitka-pdf build failed.' }
} finally { Pop-Location }

Write-Host 'Building unchanged project_vilray_studio snapshot...'
Push-Location $calculatorStage
try {
    & (Join-Path $calculatorSource 'node_modules\.bin\vite.cmd') build --configLoader=runner --base=/services/calculator/ --outDir=$calculatorOutput --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw 'project_vilray_studio build failed.' }
} finally { Pop-Location }

Write-Host 'Integration snapshots are ready. Original projects were not modified.'
