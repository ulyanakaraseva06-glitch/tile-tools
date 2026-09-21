$ErrorActionPreference = 'Stop'

$tileToolsRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $tileToolsRoot 'source'
$pdfSource = Join-Path $sourceRoot 'plitka-pdf'
$calculatorSource = Join-Path $sourceRoot 'project_vilray_studio'
$pdfOutput = Join-Path $tileToolsRoot 'services\pdf'
$calculatorOutput = Join-Path $tileToolsRoot 'services\calculator'

foreach ($path in @($pdfSource, $calculatorSource)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Service source not found: $path"
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $pdfSource 'node_modules'))) {
    throw 'Dependencies for plitka-pdf are not installed. Run .\\scripts\\setup-local.ps1 first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $calculatorSource 'node_modules'))) {
    throw 'Dependencies for project_vilray_studio are not installed. Run .\\scripts\\setup-local.ps1 first.'
}

Write-Host 'Building plitka-pdf from the unified repository...'
Push-Location $pdfSource
try {
    & (Join-Path $pdfSource 'node_modules\.bin\vite.cmd') build --base=/services/pdf/ --outDir=$pdfOutput --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw 'plitka-pdf build failed.' }
} finally { Pop-Location }

Write-Host 'Building project_vilray_studio from the unified repository...'
Push-Location $calculatorSource
try {
    & (Join-Path $calculatorSource 'node_modules\.bin\vite.cmd') build --base=/services/calculator/ --outDir=$calculatorOutput --emptyOutDir
    if ($LASTEXITCODE -ne 0) { throw 'project_vilray_studio build failed.' }
} finally { Pop-Location }

Write-Host 'Integrated services were rebuilt from source/.'
