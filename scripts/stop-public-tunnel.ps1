$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$statePath = Join-Path $projectDirectory '.data/public-tunnel.json'
if (-not (Test-Path -LiteralPath $statePath)) { Write-Output 'Nenhum túnel registrado.'; exit 0 }
$state = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
if ($state.status -ne 'running') { Write-Output 'O túnel já está encerrado.'; exit 0 }
$started = [DateTimeOffset]::Parse($state.startedAt).UtcDateTime
$targets = @(
  @{ Id = $state.supervisorPid; Pattern = 'scripts[\\/]public-tunnel\.mjs' },
  @{ Id = $state.appPid; Pattern = 'dist[\\/]server[\\/]apps[\\/]api[\\/]src[\\/]main\.js' },
  @{ Id = $state.tunnelPid; Pattern = 'cloudflared\.exe.*tunnel.*127\.0\.0\.1:' }
)
foreach ($target in $targets) {
  $process = Get-CimInstance Win32_Process -Filter "ProcessId=$($target.Id)"
  if (-not $process) { continue }
  $created = $process.CreationDate.ToUniversalTime()
  if ($process.CommandLine -notmatch $target.Pattern -or $created -lt $started.AddMinutes(-3) -or $created -gt $started.AddSeconds(5)) {
    throw "O PID $($target.Id) não corresponde à execução registrada. Nenhum processo diferente será encerrado."
  }
}
foreach ($target in $targets) {
  Stop-Process -Id $target.Id -ErrorAction SilentlyContinue
}
@{ status = 'stopped'; stoppedAt = [DateTimeOffset]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath $statePath
Write-Output 'Túnel e aplicação pública encerrados. Banco e ambiente de desenvolvimento preservados.'
