$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Instale e abra Docker Desktop (containers Linux) ou use um servidor Linux com Docker Engine.' }
docker compose version
if ($LASTEXITCODE -ne 0) { throw 'Docker Compose não está disponível.' }
if (-not (Test-Path -LiteralPath '.env.server')) {
  Copy-Item -LiteralPath '.env.server.example' -Destination '.env.server'
  Write-Host 'Criado .env.server. Preencha IP, senha do banco e chaves conforme INSTALAR.md; execute este script novamente.'
  exit 1
}
docker compose --env-file .env.server -f compose.server.yaml config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Revise os valores de .env.server.' }
docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'A inicialização falhou. Veja os logs com o comando de INSTALAR.md.' }
Write-Host 'Karaoke Míque iniciado! Abra o WEB_ORIGIN definido em .env.server no computador, TV e celulares.'
