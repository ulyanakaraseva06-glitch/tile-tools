$ErrorActionPreference = 'Stop'

$tileToolsRoot = Split-Path -Parent $PSScriptRoot
$visualizerRoot = Join-Path $tileToolsRoot 'source\sravni-plitku'
$sessionPath = Join-Path $tileToolsRoot 'storage\sessions'
$runtimePath = Join-Path $tileToolsRoot 'storage\runtime'

New-Item -ItemType Directory -Force -Path $sessionPath, $runtimePath | Out-Null

if (-not (Test-Path -LiteralPath $visualizerRoot)) {
    throw "Visualizer source not found: $visualizerRoot"
}

function Start-PhpService {
    param([int]$Port, [string]$DocumentRoot, [string]$Name, [string]$Router = '')
    $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($listener) {
        Write-Host "$Name is already running at http://127.0.0.1:$Port"
        return $null
    }
    $stdout = Join-Path $runtimePath "$Name.stdout.log"
    $stderr = Join-Path $runtimePath "$Name.stderr.log"
    $arguments = @('-d', "session.save_path=$sessionPath", '-S', "127.0.0.1:$Port", '-t', $DocumentRoot)
    if ($Router -ne '') { $arguments += $Router }
    $process = Start-Process -FilePath 'php' -ArgumentList $arguments -WorkingDirectory $DocumentRoot -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru
    Write-Host "$Name started at http://127.0.0.1:$Port"
    return $process.Id
}

$processIds = @()
$shellPid = Start-PhpService -Port 8080 -DocumentRoot $tileToolsRoot -Name 'tile-tools'
$visualizerRouter = Join-Path $PSScriptRoot 'visualizer-router.php'
$visualizerPid = Start-PhpService -Port 8081 -DocumentRoot $visualizerRoot -Name 'sravni-plitku' -Router $visualizerRouter
if ($shellPid) { $processIds += $shellPid }
if ($visualizerPid) { $processIds += $visualizerPid }
$processIds | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimePath 'local-pids.json') -Encoding UTF8
Write-Host 'Open http://127.0.0.1:8080'
