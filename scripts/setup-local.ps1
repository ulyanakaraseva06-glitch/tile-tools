$ErrorActionPreference = 'Stop'

$tileToolsRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $tileToolsRoot 'source'
$npmCache = Join-Path $tileToolsRoot 'storage\runtime\npm-cache'
$projects = @(
    (Join-Path $sourceRoot 'plitka-pdf'),
    (Join-Path $sourceRoot 'project_vilray_studio')
)

New-Item -ItemType Directory -Force -Path $npmCache | Out-Null

foreach ($project in $projects) {
    if (-not (Test-Path -LiteralPath (Join-Path $project 'package-lock.json'))) {
        throw "package-lock.json not found: $project"
    }
    Write-Host "Installing dependencies in $project..."
    Push-Location $project
    try {
        npm ci --cache $npmCache
        if ($LASTEXITCODE -ne 0) { throw "npm ci failed in $project" }
    } finally { Pop-Location }
}

& (Join-Path $PSScriptRoot 'build-integrations.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Integrated build failed.' }

Write-Host 'Setup completed. Start the service with .\\scripts\\start-local.ps1'
