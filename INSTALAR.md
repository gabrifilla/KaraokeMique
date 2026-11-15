# Instalar Karaoke Míque no servidor da casa

O pacote roda em Linux com Docker Engine e Compose, ou em Windows com Docker Desktop usando **containers Linux**. O computador que vai ser o servidor precisa ficar ligado. A TV e os celulares só precisam de um navegador e de estar na mesma rede. A internet continua necessária para o YouTube, os GIFs e a primeira instalação.

Se o servidor for **Windows Server**, use uma máquina virtual Linux para o Docker, porque o Docker Desktop não roda nesse sistema. Fontes oficiais: [Docker no Linux](https://docs.docker.com/engine/install/), [Docker Desktop no Windows](https://docs.docker.com/desktop/setup/install/windows-install/), [Compose](https://docs.docker.com/compose/install/).

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

Troque o IP pelo do seu servidor e os textos em maiúsculas pela sua senha e pelas suas chaves. As chaves são as mesmas que o projeto já usa: YouTube Data API v3 e GIPHY. Sem a do YouTube, a busca avisa que está indisponível. Sem a do GIPHY, os emojis continuam funcionando. Nesse modo o app nunca mostra vídeos de mentira.

Não compartilhe o `.env.server`. A `YOUTUBE_API_KEY` fica só no servidor. A `VITE_GIPHY_API_KEY` vai junto no código do site, porque é assim que o GIPHY funciona em apps web. Se as chaves tiverem restrição de origem, libere o endereço novo nelas. O pacote não leva nenhuma chave nem dado seu.

Usando Docker, as outras linhas do exemplo podem ficar como estão. O `DATABASE_URL` só serve para instalar sem Docker; com Docker, o Compose monta a conexão sozinho. Use só letras e números na senha, para ela funcionar dentro dessa URL sem precisar de escape.

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

Na primeira vez ele baixa as dependências e as imagens e compila tudo, então demora um pouco. Espere os serviços ficarem saudáveis. O banco é criado sozinho, e rodar de novo não estraga nada. Com Docker, você não precisa instalar Node nem pnpm no servidor.

## 4. Abrir na TV e celulares

Abra exatamente o endereço do `WEB_ORIGIN`, por exemplo **http://karaoke.192.168.1.100.sslip.io:8080**, em todos os aparelhos. O `sslip.io` só traduz esse nome para o IP do servidor, e o tráfego continua dentro de casa. Se a rede bloquear esse serviço, configure um nome local ou use o IP direto só para investigar o problema: nos testes, o YouTube recusou alguns vídeos abertos pelo IP.

Se o firewall bloquear, libere a porta TCP **8080 só para a rede privada**. Não abra essa porta no roteador para a internet. O PostgreSQL não fica exposto fora do Docker. O `ALLOW_HTTP_LAN=true` libera HTTP sem criptografia apenas para endereços da rede de casa; um endereço público em HTTP continua bloqueado. Para usar pela internet, configure HTTPS e desligue essa opção.

Crie uma sala pelo celular. Na TV, escolha **Usar como palco**. Escaneie o QR da TV e aprove pelo celular do anfitrião, ou digite o código de seis dígitos em **Palco → Conectar ou reconfigurar TV**. Aqui o atalho de desenvolvimento, que aceita qualquer código, fica desligado. A tela cheia e o primeiro som podem pedir um toque na própria TV.

## Ligar, parar, atualizar e diagnosticar

Os containers usam `restart: unless-stopped`, então voltam sozinhos depois de reiniciar o servidor. No Linux, deixe o Docker ativado para iniciar com o sistema. No Windows, eles só voltam quando o Docker Desktop abrir, o que depende de alguém entrar na conta.

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

Não atualize no meio de uma festa. Guarde o `.env.server` e o volume do banco. Não rode duas cópias do app no mesmo banco, porque a fila só suporta uma instância. Nunca use `down -v`: ele apaga o volume com os dados. Se você trocar a senha no arquivo depois que o banco já existe, a senha do PostgreSQL não muda junto.

| Sintoma                          | O que conferir                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Docker não encontrado            | Instalação/daemon aberto, containers Linux e Compose disponíveis               |
| Banco ou app não saudável        | Logs, senha preenchida e `WEB_ORIGIN` correto                                  |
| Abre no servidor, não no celular | Mesma rede, IP correto, firewall privado e rede de convidados sem isolamento   |
| Redireciona para endereço errado | Corrigir `WEB_ORIGIN`; manter porta igual a `APP_PORT` e reiniciar/recriar app |
| Busca/GIF indisponível           | Chaves, quotas, API habilitada e acesso à internet                             |
| YouTube/autoplay bloqueado       | Gesto inicial na TV, hostname configurado e diagnóstico do player              |

## Backup do banco

Na pasta do projeto, crie uma pasta `backups` (pelo gerenciador de arquivos ou com `mkdir backups`) e rode os dois comandos abaixo. O primeiro gera o backup dentro do container e o segundo copia o arquivo para fora. Assim o PowerShell não corrompe o arquivo binário:

```sh
docker compose --env-file .env.server -f compose.server.yaml exec -T database pg_dump -U karaoke -d karaoke -Fc -f /tmp/karaoke-backup.dump
docker compose --env-file .env.server -f compose.server.yaml cp database:/tmp/karaoke-backup.dump ./backups/karaoke-backup.dump
```

Coloque a data no nome do arquivo e guarde em outro disco. Ele tem os dados das salas e das sessões, então não deixe em lugar público. Restaurar **substitui o banco atual**. Antes, faça um backup do estado de agora, pare o app e só então rode:

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

O `pnpm build` lê o `.env.server`, se ele existir, e gera `dist/web` e `dist/server` com a migração SQL junto. O `pnpm start` usa esse mesmo arquivo e roda o JavaScript compilado, sem tsx nem Vite. Para o app voltar sozinho depois de reiniciar a máquina, cadastre-o como serviço do sistema. Ele não enxerga o PostgreSQL de desenvolvimento de outro computador.

## O que já foi testado

O build e a versão compilada foram testados no computador de desenvolvimento. **Esse computador não tem Docker, então a imagem e o Compose ainda precisam rodar de verdade no servidor de destino.** Nada foi instalado em outra máquina ainda. TV e celulares de verdade, o som e a leitura do QR precisam de um teste na rede da casa.
