# Karaoke Míque: instala e inicia o servidor com Docker.
# Uso (na pasta do projeto):  powershell -ExecutionPolicy Bypass -File .\INICIAR.ps1
# Na primeira vez ele cria o .env.server e para. Preencha o arquivo e rode de novo.
# Pode rodar quantas vezes quiser: ele atualiza o que mudou e mantém os dados.

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$configFile = '.env.server'
$placeholderDomain = 'seudominio'

function Stop-WithError([string]$message) {
  Write-Host ''
  Write-Host $message -ForegroundColor Red
  exit 1
}

function Write-Step([string]$message) {
  Write-Host ''
  Write-Host "==> $message" -ForegroundColor Cyan
}

function Read-Config([string]$path) {
  $values = @{}
  foreach ($line in [IO.File]::ReadAllLines((Resolve-Path -LiteralPath $path).Path)) {
    $text = $line.Trim()
    if ($text -eq '' -or $text.StartsWith('#')) { continue }
    $index = $text.IndexOf('=')
    if ($index -lt 1) { continue }
    $values[$text.Substring(0, $index).Trim()] = $text.Substring($index + 1).Trim()
  }
  return $values
}

function Get-Value($config, [string]$key) {
  if ($config.ContainsKey($key)) { return [string]$config[$key] }
  return ''
}

function New-Password {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'.ToCharArray()
  $bytes = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

# ---------------------------------------------------------------------------
# 1. Arquivo de configuração
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $configFile)) {
  Copy-Item -LiteralPath '.env.server.example' -Destination $configFile
  Write-Host ''
  Write-Host 'Criei o arquivo .env.server nesta pasta.' -ForegroundColor Yellow
  Write-Host 'Abra ele no Bloco de Notas, preencha os valores (veja INSTALAR.md) e rode este script de novo.'
  Write-Host "  notepad $configFile"
  exit 1
}

Write-Step 'Conferindo o .env.server'
$config = Read-Config $configFile

$mode = (Get-Value $config 'ACCESS_MODE').ToLower()
if ($mode -eq '') { $mode = 'internet' }
if ($mode -ne 'internet' -and $mode -ne 'casa') {
  Stop-WithError "ACCESS_MODE deve ser 'internet' ou 'casa' (está '$mode')."
}

$origin = Get-Value $config 'WEB_ORIGIN'
$originUri = $null
if (-not [Uri]::TryCreate($origin, [UriKind]::Absolute, [ref]$originUri) -or $originUri.AbsolutePath -ne '/' -or $origin.EndsWith('/')) {
  Stop-WithError "WEB_ORIGIN precisa ser só o endereço, sem barra no final. Exemplo: https://karaoke.meudominio.com.br (está '$origin')."
}

if ($mode -eq 'internet') {
  if ($originUri.Scheme -ne 'https') { Stop-WithError 'No modo internet, o WEB_ORIGIN precisa começar com https://' }
  if ($origin.Contains($placeholderDomain)) { Stop-WithError 'Troque o WEB_ORIGIN pelo endereço que você criou na Cloudflare.' }
  $token = Get-Value $config 'CLOUDFLARE_TUNNEL_TOKEN'
  if ($token.Length -lt 50) {
    Stop-WithError 'Preencha CLOUDFLARE_TUNNEL_TOKEN com o token do túnel (veja INSTALAR.md, parte da Cloudflare).'
  }
} else {
  if ($origin.Contains('IP-DO-SERVIDOR')) { Stop-WithError 'Troque IP-DO-SERVIDOR no WEB_ORIGIN pelo IP deste computador.' }
  $port = Get-Value $config 'APP_PORT'
  if ($port -eq '') { $port = '8080' }
  if ($originUri.Port -ne [int]$port) {
    Stop-WithError "No modo casa, a porta do WEB_ORIGIN ($($originUri.Port)) precisa ser igual ao APP_PORT ($port)."
  }
}

if ((Get-Value $config 'YOUTUBE_API_KEY') -eq '') {
  Write-Host 'Aviso: YOUTUBE_API_KEY está vazia. O app sobe, mas a busca de músicas não vai funcionar.' -ForegroundColor Yellow
}
if ((Get-Value $config 'VITE_GIPHY_API_KEY') -eq '') {
  Write-Host 'Aviso: VITE_GIPHY_API_KEY está vazia. Só os emojis vão funcionar, sem GIFs.' -ForegroundColor Yellow
}

$password = Get-Value $config 'POSTGRES_PASSWORD'
if ($password -eq '') {
  $password = New-Password
  $configPath = (Resolve-Path -LiteralPath $configFile).Path
  $lines = [IO.File]::ReadAllLines($configPath)
  $lines = $lines | ForEach-Object { if ($_ -match '^\s*POSTGRES_PASSWORD\s*=') { "POSTGRES_PASSWORD=$password" } else { $_ } }
  [IO.File]::WriteAllLines($configPath, [string[]]$lines, (New-Object Text.UTF8Encoding $false))
  Write-Host 'Gerei uma senha para o banco e guardei no .env.server. Não troque mais ela.' -ForegroundColor Green
} elseif ($password -notmatch '^[A-Za-z0-9]{16,}$') {
  Stop-WithError 'POSTGRES_PASSWORD precisa ter pelo menos 16 caracteres, só letras e números. Ou deixe vazia para eu gerar uma.'
}

# ---------------------------------------------------------------------------
# 2. Docker
# ---------------------------------------------------------------------------
Write-Step 'Conferindo o Docker'
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Stop-WithError 'Docker não encontrado. Instale o Docker Desktop (https://docs.docker.com/desktop/setup/install/windows-install/), abra ele e rode este script de novo.'
}
docker compose version
if ($LASTEXITCODE -ne 0) { Stop-WithError 'O Docker Compose não está disponível. Atualize o Docker Desktop.' }
docker info --format '{{.OSType}}' | Out-Null
if ($LASTEXITCODE -ne 0) { Stop-WithError 'O Docker está instalado, mas não está rodando. Abra o Docker Desktop, espere ele ficar pronto e rode de novo.' }

# ---------------------------------------------------------------------------
# 3. Subir os serviços
# ---------------------------------------------------------------------------
# Estes valores dependem do modo e têm prioridade sobre o .env.server.
if ($mode -eq 'internet') {
  $env:ALLOW_HTTP_LAN = 'false'
  $env:LISTEN_ADDRESS = '127.0.0.1'
  # O túnel chega ao app pela rede interna do Docker e informa o IP real de quem acessa.
  $env:TRUST_PROXY = 'uniquelocal'
  $composeArgs = @('--env-file', $configFile, '-f', 'compose.server.yaml', '-f', 'compose.tunnel.yaml')
} else {
  $env:ALLOW_HTTP_LAN = 'true'
  $env:LISTEN_ADDRESS = '0.0.0.0'
  $env:TRUST_PROXY = ''
  $composeArgs = @('--env-file', $configFile, '-f', 'compose.server.yaml')
}

docker compose @composeArgs config --quiet
if ($LASTEXITCODE -ne 0) { Stop-WithError 'O Docker recusou a configuração. Revise o .env.server.' }

Write-Step 'Construindo e iniciando (a primeira vez demora alguns minutos)'
docker compose @composeArgs up -d --build --remove-orphans --wait --wait-timeout 300
if ($LASTEXITCODE -ne 0) {
  Write-Host ''
  Write-Host 'Últimas linhas do log:' -ForegroundColor Yellow
  docker compose @composeArgs logs --tail=40
  Stop-WithError 'Não consegui iniciar. Veja o log acima e a tabela de problemas no INSTALAR.md.'
}

# ---------------------------------------------------------------------------
# 4. Conferir o endereço público
# ---------------------------------------------------------------------------
Write-Step "Testando $origin"
# O Windows PowerShell 5.1 nem sempre ativa TLS 1.2 sozinho.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$healthy = $false
for ($attempt = 1; $attempt -le 30; $attempt++) {
  try {
    $response = Invoke-WebRequest -Uri "$origin/api/v1/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) { $healthy = $true; break }
  } catch { }
  Start-Sleep -Seconds 3
}

Write-Host ''
if ($healthy) {
  Write-Host 'Karaoke Míque no ar!' -ForegroundColor Green
  Write-Host "Abra $origin na TV e nos celulares."
} else {
  Write-Host 'Os serviços subiram, mas o endereço ainda não respondeu.' -ForegroundColor Yellow
  if ($mode -eq 'internet') {
    Write-Host 'Confira no painel da Cloudflare se o túnel está "Healthy" e se o nome público aponta para http://app:3001.'
    Write-Host 'Às vezes o DNS demora alguns minutos. Para ver o túnel:'
    Write-Host "  docker compose $($composeArgs -join ' ') logs --tail=40 tunnel"
  } else {
    Write-Host 'Confira o IP no WEB_ORIGIN e se o firewall libera a porta na rede privada.'
  }
}
