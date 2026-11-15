#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
if ! command -v docker >/dev/null 2>&1; then
  echo 'Instale Docker Engine e o plugin Docker Compose. Consulte INSTALAR.md.' >&2
  exit 1
fi
docker compose version
if [ ! -f .env.server ]; then
  cp .env.server.example .env.server
  chmod 600 .env.server
  echo 'Criado .env.server. Preencha IP, senha do banco e chaves conforme INSTALAR.md; execute novamente.'
  exit 1
fi
docker compose --env-file .env.server -f compose.server.yaml config --quiet
docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait --wait-timeout 180
echo 'Karaoke Míque iniciado! Abra o WEB_ORIGIN de .env.server na TV e celulares.'
