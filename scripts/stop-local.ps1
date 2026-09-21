$ErrorActionPreference = 'Stop'

$tileToolsRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $tileToolsRoot 'storage\runtime\local-pids.json'
if (-not (Test-Path -LiteralPath $pidFile)) {
    Write-Host 'No Tile Tools process list found.'
    exit 0
}
$processIds = Get-Content -Raw -LiteralPath $pidFile | ConvertFrom-Json
foreach ($processId in $processIds) {
    $process = Get-Process -Id ([int]$processId) -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq 'php') {
        Stop-Process -Id $process.Id
        Write-Host "Stopped PHP process $($process.Id)."
    }
}
