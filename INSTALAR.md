# Instalar Karaoke Míque no servidor da casa

O pacote funciona em Linux com Docker Engine + Compose ou em Windows compatível com Docker Desktop, usando **containers Linux**. O computador servidor fica ligado; TV/celulares só precisam de navegador e da mesma rede. Internet continua necessária para YouTube, GIFs e a primeira instalação.

Se for **Windows Server**, prefira uma máquina virtual Linux para o Docker: Docker Desktop não é suportado nesse sistema. Fontes oficiais: [Docker no Linux](https://docs.docker.com/engine/install/), [Docker Desktop no Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [Compose](https://docs.docker.com/compose/install/).

## 1. Preparar

1. Extraia o pacote para uma pasta permanente, por exemplo `C:\karaoke-mique` ou `/opt/karaoke-mique`.
2. Instale o Docker apropriado e confirme `docker compose version`. No Windows, abra Docker Desktop e mantenha o modo Linux.
3. Descubra o IPv4 do servidor: `ipconfig` no Windows ou `hostname -I` no Linux. Exemplo abaixo: **192.168.1.100**. Reserve esse endereço no roteador para ele não mudar.
4. Copie `.env.server.example` para `.env.server`. No Windows os arquivos iniciados por ponto podem estar ocultos; não salve como `.env.server.txt`.

## 2. Preencher configuração

Abra `.env.server` num editor e ajuste:

```dotenv
WEB_ORIGIN=http://karaoke.192.168.1.100.sslip.io:8080
APP_PORT=8080
ALLOW_HTTP_LAN=true
POSTGRES_PASSWORD=COLOQUE_UMA_SENHA_LONGA_SO_COM_LETRAS_E_NUMEROS
YOUTUBE_API_KEY=COLOQUE_SUA_CHAVE_YOUTUBE
VITE_GIPHY_API_KEY=COLOQUE_SUA_CHAVE_GIPHY
```

Substitua o IP pelo do servidor e os exemplos pelas suas credenciais. Não coloque as linhas de exemplo acima em produção sem trocar os valores. As chaves são as mesmas integrações usadas no projeto: YouTube Data API v3 e GIPHY. Sem YouTube a busca informa indisponibilidade; sem GIPHY, emojis continuam disponíveis. Não há vídeos falsos neste modo.

Não compartilhe `.env.server`. `VITE_GIPHY_API_KEY` é chave web e entra no frontend por desenho; `YOUTUBE_API_KEY` fica no backend. Restrições de origem das chaves precisam aceitar o novo hostname. O pacote distribuído não contém suas chaves ou dados existentes.

As demais linhas do exemplo podem ficar como estão ao usar Docker. `DATABASE_URL` do exemplo é apenas para instalação sem Docker; o Compose monta a conexão do banco automaticamente. A senha deve conter somente letras/números para essa URL não precisar de escapes.

## 3. Iniciar

Na pasta extraída, execute:

**Windows, PowerShell:**

```powershell
powershell -ExecutionPolicy Bypass -File .\INICIAR.ps1
```

**Linux:**

```sh
sh iniciar.sh
```

Ou, nos dois sistemas:

```sh
docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait --wait-timeout 180
```

A primeira execução baixa dependências/imagens e compila. Aguarde os serviços ficarem saudáveis. Migração inicial do banco é automática e idempotente. Não é necessário instalar Node/pnpm no computador host se usar Docker.

## 4. Abrir na TV e celulares

Abra exatamente o `WEB_ORIGIN`, por exemplo **http://karaoke.192.168.1.100.sslip.io:8080**, em todos os dispositivos. `sslip.io` resolve o hostname para o IP privado; o tráfego da aplicação continua dentro da casa. Se a rede bloquear esse DNS, configure um nome local/DNS compatível ou use o IP privado para diagnosticar; alguns vídeos YouTube já recusaram reprodução pelo IP direto no ensaio deste projeto.

Se necessário, permita a porta TCP **8080 somente na rede privada** do firewall. Não abra a porta do roteador para a internet. O PostgreSQL não publica porta no host. HTTP com `ALLOW_HTTP_LAN=true` é uma opção explícita para a rede da casa, sem criptografia; endereço público em HTTP continua recusado. Para internet, use HTTPS e desligue essa opção.

Crie uma sala pelo celular. Na TV, escolha **Usar como palco**. Escaneie o QR da TV e aprove pelo celular do anfitrião, ou informe o código de seis dígitos em **Palco → Conectar ou reconfigurar TV**. Código livre de desenvolvimento fica desativado. Tela cheia e a primeira liberação de áudio podem exigir uma ação na TV.

## Ligar, parar, atualizar e diagnosticar

Os containers usam `restart: unless-stopped`. No Linux mantenha o Docker habilitado no boot; no Windows Desktop depende da inicialização do Docker/sessão do sistema.

```sh
# Ver estado
docker compose --env-file .env.server -f compose.server.yaml ps
# Ver os últimos logs (não cole credenciais em chats)
docker compose --env-file .env.server -f compose.server.yaml logs --tail=100 app
# Parar, preservando dados
docker compose --env-file .env.server -f compose.server.yaml stop
# Retomar
docker compose --env-file .env.server -f compose.server.yaml up -d --wait
# Reconstruir depois de atualizar arquivos ou chave GIPHY
docker compose --env-file .env.server -f compose.server.yaml up -d --build --wait
```

Atualize somente fora de uma apresentação. Preserve `.env.server` e o volume do banco. Não rode duas instâncias da aplicação para o mesmo banco: o worker atual é de instância única. Não use `down -v`, pois remove o volume com dados. Trocar a senha no arquivo após o banco ter sido criado não altera automaticamente a senha no PostgreSQL.

| Sintoma | O que conferir |
| --- | --- |
| Docker não encontrado | Instalação/daemon aberto, containers Linux e Compose disponíveis |
| Banco ou app não saudável | Logs, senha preenchida e `WEB_ORIGIN` correto |
| Abre no servidor, não no celular | Mesma rede, IP correto, firewall privado e rede de convidados sem isolamento |
| Redireciona para endereço errado | Corrigir `WEB_ORIGIN`; manter porta igual a `APP_PORT` e reiniciar/recriar app |
| Busca/GIF indisponível | Chaves, quotas, API habilitada e acesso à internet |
| YouTube/autoplay bloqueado | Gesto inicial na TV, hostname configurado e diagnóstico do player |

## Backup do banco

Na pasta do projeto, crie a pasta `backups` (Explorer/gerenciador de arquivos ou `mkdir backups`) e execute os dois comandos abaixo. O dump é gerado dentro do container e copiado como arquivo, sem redirecionamento binário pelo PowerShell:

```sh
docker compose --env-file .env.server -f compose.server.yaml exec -T database pg_dump -U karaoke -d karaoke -Fc -f /tmp/karaoke-backup.dump
docker compose --env-file .env.server -f compose.server.yaml cp database:/tmp/karaoke-backup.dump ./backups/karaoke-backup.dump
```

Renomeie o arquivo com a data e guarde em outro disco. Contém dados de salas/sessões, portanto mantenha acesso restrito. Para restaurar **substituindo o banco atual**, faça primeiro um backup atual, pare o app e só então execute:

```sh
docker compose --env-file .env.server -f compose.server.yaml stop app
docker compose --env-file .env.server -f compose.server.yaml cp ./backups/karaoke-backup.dump database:/tmp/restaurar.dump
docker compose --env-file .env.server -f compose.server.yaml exec -T database pg_restore -U karaoke -d karaoke --clean --if-exists --no-owner /tmp/restaurar.dump
docker compose --env-file .env.server -f compose.server.yaml up -d --wait
```

## Alternativa sem Docker

Requer Node 24, pnpm 11.5.0 e PostgreSQL próprio. Configure também `DATABASE_URL` correto em `.env.server` (com senha escapada na URL se tiver caracteres especiais). Depois:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

`pnpm build` lê `.env.server` se existir; gera `dist/web` e `dist/server`, incluindo a migração SQL. `pnpm start` usa esse arquivo e executa JavaScript compilado, sem tsx nem Vite. Use o serviço/supervisor do sistema para mantê-lo ativo após reiniciar. Não usa automaticamente o PostgreSQL de desenvolvimento do outro computador.

## Estado da validação

Build e execução compilada são verificados localmente. **Docker não está disponível na máquina de desenvolvimento; a imagem e o Compose ainda precisam de execução real no servidor de destino.** A configuração não foi publicada nem instalada remotamente. TV/celulares físicos, áudio e escaneamento do QR precisam do ensaio na rede da casa.
