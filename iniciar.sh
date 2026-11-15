#!/bin/sh
# Karaoke Míque: instala e inicia o servidor com Docker.
# Uso (na pasta do projeto):  sh iniciar.sh
# Na primeira vez ele cria o .env.server e para. Preencha o arquivo e rode de novo.
# Pode rodar quantas vezes quiser: ele atualiza o que mudou e mantém os dados.
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

CONFIG=.env.server

red() { printf '\n\033[31m%s\033[0m\n' "$1" >&2; }
yellow() { printf '\033[33m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
fail() { red "$1"; exit 1; }

# Lê KEY=valor do .env.server sem executar o arquivo.
value() {
  sed -n "s/^[[:space:]]*$1[[:space:]]*=[[:space:]]*//p" "$CONFIG" | tail -n 1 | sed 's/[[:space:]]*$//; s/\r$//'
}

# ---------------------------------------------------------------------------
# 1. Arquivo de configuração
# ---------------------------------------------------------------------------
if [ ! -f "$CONFIG" ]; then
  cp .env.server.example "$CONFIG"
  chmod 600 "$CONFIG"
  echo
  yellow 'Criei o arquivo .env.server nesta pasta.'
  echo 'Preencha os valores (veja INSTALAR.md) e rode este script de novo:'
  echo "  nano $CONFIG"
  exit 1
fi

step 'Conferindo o .env.server'
MODE=$(value ACCESS_MODE | tr '[:upper:]' '[:lower:]')
[ -n "$MODE" ] || MODE=internet
case "$MODE" in
  internet | casa) ;;
  *) fail "ACCESS_MODE deve ser 'internet' ou 'casa' (está '$MODE')." ;;
esac

ORIGIN=$(value WEB_ORIGIN)
case "$ORIGIN" in
  http://*/* | https://*/* | */)
    fail "WEB_ORIGIN precisa ser só o endereço, sem barra no final. Exemplo: https://karaoke.meudominio.com.br (está '$ORIGIN')." ;;
  http://?* | https://?*) ;;
  *) fail "WEB_ORIGIN precisa começar com http:// ou https:// (está '$ORIGIN')." ;;
esac

if [ "$MODE" = internet ]; then
  case "$ORIGIN" in https://*) ;; *) fail 'No modo internet, o WEB_ORIGIN precisa começar com https://' ;; esac
  case "$ORIGIN" in *seudominio*) fail 'Troque o WEB_ORIGIN pelo endereço que você criou na Cloudflare.' ;; esac
  TOKEN=$(value CLOUDFLARE_TUNNEL_TOKEN)
  [ "${#TOKEN}" -ge 50 ] || fail 'Preencha CLOUDFLARE_TUNNEL_TOKEN com o token do túnel (veja INSTALAR.md, parte da Cloudflare).'
else
  case "$ORIGIN" in *IP-DO-SERVIDOR*) fail 'Troque IP-DO-SERVIDOR no WEB_ORIGIN pelo IP deste computador.' ;; esac
  PORT=$(value APP_PORT)
  [ -n "$PORT" ] || PORT=8080
  ORIGIN_PORT=$(printf '%s' "$ORIGIN" | sed -n 's/.*:\([0-9][0-9]*\)$/\1/p')
  [ -n "$ORIGIN_PORT" ] || ORIGIN_PORT=80
  [ "$ORIGIN_PORT" = "$PORT" ] || fail "No modo casa, a porta do WEB_ORIGIN ($ORIGIN_PORT) precisa ser igual ao APP_PORT ($PORT)."
fi

[ -n "$(value YOUTUBE_API_KEY)" ] || yellow 'Aviso: YOUTUBE_API_KEY está vazia. O app sobe, mas a busca de músicas não vai funcionar.'
[ -n "$(value VITE_GIPHY_API_KEY)" ] || yellow 'Aviso: VITE_GIPHY_API_KEY está vazia. Só os emojis vão funcionar, sem GIFs.'

PASSWORD=$(value POSTGRES_PASSWORD)
if [ -z "$PASSWORD" ]; then
  PASSWORD=$(LC_ALL=C tr -dc 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789' </dev/urandom | head -c 32)
  TMP=$(mktemp)
  sed "s/^[[:space:]]*POSTGRES_PASSWORD[[:space:]]*=.*/POSTGRES_PASSWORD=$PASSWORD/" "$CONFIG" >"$TMP"
  cat "$TMP" >"$CONFIG"
  rm -f "$TMP"
  green 'Gerei uma senha para o banco e guardei no .env.server. Não troque mais ela.'
elif ! printf '%s' "$PASSWORD" | grep -Eq '^[A-Za-z0-9]{16,}$'; then
  fail 'POSTGRES_PASSWORD precisa ter pelo menos 16 caracteres, só letras e números. Ou deixe vazia para eu gerar uma.'
fi
chmod 600 "$CONFIG" 2>/dev/null || true

# ---------------------------------------------------------------------------
# 2. Docker
# ---------------------------------------------------------------------------
step 'Conferindo o Docker'
command -v docker >/dev/null 2>&1 || fail 'Docker não encontrado. Instale o Docker Engine com o plugin Compose (https://docs.docker.com/engine/install/) e rode de novo.'
docker compose version || fail 'O plugin Docker Compose não está instalado.'
docker info >/dev/null 2>&1 || fail 'O Docker não está rodando ou seu usuário não tem permissão. Tente: sudo systemctl start docker, ou rode com sudo.'

# ---------------------------------------------------------------------------
# 3. Subir os serviços
# ---------------------------------------------------------------------------
# Estes valores dependem do modo e têm prioridade sobre o .env.server.
if [ "$MODE" = internet ]; then
  export ALLOW_HTTP_LAN=false LISTEN_ADDRESS=127.0.0.1
  # O túnel chega ao app pela rede interna do Docker e informa o IP real de quem acessa.
  export TRUST_PROXY=uniquelocal
  set -- --env-file "$CONFIG" -f compose.server.yaml -f compose.tunnel.yaml
else
  export ALLOW_HTTP_LAN=true LISTEN_ADDRESS=0.0.0.0 TRUST_PROXY=
  set -- --env-file "$CONFIG" -f compose.server.yaml
fi

docker compose "$@" config --quiet || fail 'O Docker recusou a configuração. Revise o .env.server.'

step 'Construindo e iniciando (a primeira vez demora alguns minutos)'
if ! docker compose "$@" up -d --build --remove-orphans --wait --wait-timeout 300; then
  echo
  yellow 'Últimas linhas do log:'
  docker compose "$@" logs --tail=40 || true
  fail 'Não consegui iniciar. Veja o log acima e a tabela de problemas no INSTALAR.md.'
fi

# ---------------------------------------------------------------------------
# 4. Conferir o endereço público
# ---------------------------------------------------------------------------
step "Testando $ORIGIN"
HEALTHY=false
attempt=0
while [ "$attempt" -lt 30 ]; do
  attempt=$((attempt + 1))
  if command -v curl >/dev/null 2>&1; then
    check() { curl -fsS --max-time 10 "$1" >/dev/null 2>&1; }
  else
    check() { wget -q -T 10 -O /dev/null "$1" >/dev/null 2>&1; }
  fi
  if check "$ORIGIN/api/v1/health"; then
    HEALTHY=true
    break
  fi
  sleep 3
done

echo
if [ "$HEALTHY" = true ]; then
  green 'Karaoke Míque no ar!'
  echo "Abra $ORIGIN na TV e nos celulares."
else
  yellow 'Os serviços subiram, mas o endereço ainda não respondeu.'
  if [ "$MODE" = internet ]; then
    echo 'Confira no painel da Cloudflare se o túnel está "Healthy" e se o nome público aponta para http://app:3001.'
    echo 'Às vezes o DNS demora alguns minutos. Para ver o túnel:'
    echo "  docker compose $* logs --tail=40 tunnel"
  else
    echo 'Confira o IP no WEB_ORIGIN e se o firewall libera a porta na rede privada.'
  fi
fi
