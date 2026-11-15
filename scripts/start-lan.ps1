param(
  [string]$Address,
  [ValidateRange(1024, 65535)][int]$WebPort = 5176,
  [ValidateRange(1024, 65535)][int]$ApiPort = 3004
)

$ErrorActionPreference = 'Stop'
if (-not $Address) {
  $taskAddresses = @(Get-NetIPConfiguration |
    Where-Object { $_.IPv4DefaultGateway -ne $null } |
    ForEach-Object { $_.IPv4Address.IPAddress } |
    Select-Object -Unique)
  if ($taskAddresses.Count -ne 1) {
    throw 'Informe o IPv4 da rede local usando -Address.'
  }
  $Address = $taskAddresses[0]
}
$taskIp = [System.Net.IPAddress]::Parse($Address)
if ($taskIp.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) {
  throw 'Use um endereço IPv4 da rede local.'
}

$env:WEB_ORIGIN = "http://karaoke.$Address.sslip.io:$WebPort"
$env:PORT = "$ApiPort"
$env:VITE_PORT = "$WebPort"
Write-Host "Abra no computador e nos celulares: $env:WEB_ORIGIN"
pnpm dev
