# Instalar o Karaoke Míque num servidor

Este guia coloca o karaokê num computador que fica ligado (o servidor) e deixa ele acessível por um endereço fixo com HTTPS, tipo `https://karaoke.seudominio.com.br`. Qualquer pessoa com o link entra de qualquer rede, inclusive pelo 4G. Não precisa abrir porta no roteador: a conexão sai do servidor para a Cloudflare, e a Cloudflare entrega o site.

Quase tudo é feito pelo script `INICIAR` (`INICIAR.ps1` no Windows, `iniciar.sh` no Linux). A única parte manual é criar o túnel na Cloudflare, e isso só se faz uma vez.

Se o karaokê for usado só por quem está no Wi-Fi da casa, pule a parte da Cloudflare e veja [Só na rede de casa](#só-na-rede-de-casa).

## O que você precisa

- Um computador que fique ligado durante as festas, com Windows 10/11 ou Linux. Desative a suspensão automática dele.
- Docker. No Linux, o [Docker Engine com o plugin Compose](https://docs.docker.com/engine/install/). No Windows, o [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) com containers Linux (o padrão). Windows Server não roda o Docker Desktop; nesse caso, use uma máquina virtual Linux.
- Um domínio seu cadastrado na Cloudflare (a conta é grátis; o domínio custa em torno de R$ 40 a 60 por ano).
- A chave da YouTube Data API v3, para a busca de músicas.
- A chave do GIPHY, para os GIFs. É opcional: sem ela, os emojis continuam funcionando.

## 1. Levar o projeto para o servidor

No servidor, baixe o projeto do GitHub, com `git clone` ou pelo botão **Code → Download ZIP**, e deixe numa pasta fixa, por exemplo `C:\karaoke-mique` ou `/opt/karaoke-mique`. Também dá para usar o pacote gerado por `pnpm release` na máquina de desenvolvimento.

## 2. Criar o túnel na Cloudflare

1. Na [Cloudflare](https://dash.cloudflare.com), adicione o seu domínio. Se ele foi comprado em outro lugar, a Cloudflare mostra dois nameservers para você trocar no site onde comprou. A troca pode levar algumas horas para valer.
2. Abra **Zero Trust → Networks → Tunnels** e clique em **Create a tunnel**. Escolha o tipo **Cloudflared** e dê um nome, por exemplo `karaoke`.
3. Na tela de instalação, a Cloudflare mostra um comando com um token longo, que começa com `eyJ`. Copie **só o token**, o texto depois de `--token`. Não precisa rodar o comando: o Docker já sobe o `cloudflared` sozinho.
4. Em **Public hostname**, preencha:
   - **Subdomain:** `karaoke` (ou o que preferir)
   - **Domain:** o seu domínio
   - **Service:** tipo `HTTP`, URL `app:3001`
5. Salve. O endereço do karaokê vai ser `https://karaoke.seudominio.com.br`.

O guia oficial com prints está em [Create a remote tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-remote-tunnel/). O painel da Cloudflare muda de vez em quando, mas os nomes **Tunnels** e **Public hostname** costumam se manter.

## 3. Preencher a configuração

Na pasta do projeto, rode o script uma vez. Ele cria o arquivo `.env.server` e para:

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File .\INICIAR.ps1
```

**Linux:**

```sh
sh iniciar.sh
```

Abra o `.env.server` (no Windows, `notepad .env.server`; no Linux, `nano .env.server`) e preencha estes campos:

```dotenv
ACCESS_MODE=internet
WEB_ORIGIN=https://karaoke.seudominio.com.br
CLOUDFLARE_TUNNEL_TOKEN=eyJ...o token que você copiou...
YOUTUBE_API_KEY=sua chave do YouTube
VITE_GIPHY_API_KEY=sua chave do GIPHY
```

O `WEB_ORIGIN` precisa ser exatamente o endereço do passo 2, com `https://` e sem barra no final. Deixe o `POSTGRES_PASSWORD` vazio: o script gera uma senha forte e grava no arquivo. Não mexa no resto.

Não compartilhe o `.env.server` e não suba ele para o Git. Ele guarda o token do túnel, as chaves e a senha do banco. Se a chave do YouTube tiver restrição de IP, inclua o IP público da casa.

## 4. Rodar

Rode o mesmo comando do passo 3 de novo. O script:

1. confere se o `.env.server` está certo e explica o que falta, se não estiver;
2. gera a senha do banco na primeira vez;
3. confere se o Docker está instalado e rodando;
4. constrói o app e sobe três containers: o banco, o app e o túnel;
5. testa o endereço público e avisa quando estiver no ar.

A primeira vez demora alguns minutos, porque ele baixa as imagens e compila tudo. Quando aparecer **Karaoke Míque no ar!**, abra o endereço na TV e nos celulares.

Crie uma sala pelo celular. Na TV, escolha **Usar como palco**, escaneie o QR da TV com o celular do anfitrião e confirme, ou digite o código de seis dígitos em **Palco → Conectar ou reconfigurar TV**. A tela cheia e o primeiro som podem pedir um toque na própria TV.

Para atualizar o projeto depois, baixe a versão nova por cima e rode o script de novo. Ele reconstrói só o que mudou e mantém o banco. Também é só rodar de novo depois de trocar uma chave no `.env.server`.

## Só na rede de casa

Sem domínio e sem Cloudflare, o karaokê funciona só para quem está no Wi-Fi do servidor. No `.env.server`:

```dotenv
ACCESS_MODE=casa
WEB_ORIGIN=http://karaoke.192.168.1.100.sslip.io:8080
```

Troque `192.168.1.100` pelo IP do servidor (`ipconfig` no Windows, `hostname -I` no Linux) e reserve esse IP no roteador para ele não mudar. O `sslip.io` só traduz o nome para o IP, e o tráfego continua dentro de casa. Use o nome em vez do IP puro, porque o YouTube recusou alguns vídeos abertos pelo IP. A porta no final precisa ser igual ao `APP_PORT` (8080 por padrão), e o firewall precisa liberar essa porta na rede privada. Não abra a porta no roteador.

## Uso no dia a dia

Os containers voltam sozinhos quando o servidor reinicia. No Linux, deixe o Docker ativado para iniciar com o sistema (`sudo systemctl enable docker`). No Windows, ative **Start Docker Desktop when you sign in** nas configurações do Docker Desktop. Os containers só voltam depois que alguém entra na conta do Windows.

Os comandos abaixo valem para o modo internet. No modo casa, tire o `-f compose.tunnel.yaml`.

```sh
# Ver o estado
docker compose --env-file .env.server -f compose.server.yaml -f compose.tunnel.yaml ps
# Ver os últimos logs do app ou do túnel (não cole credenciais em chats)
docker compose --env-file .env.server -f compose.server.yaml -f compose.tunnel.yaml logs --tail=100 app
docker compose --env-file .env.server -f compose.server.yaml -f compose.tunnel.yaml logs --tail=100 tunnel
# Parar sem perder dados
docker compose --env-file .env.server -f compose.server.yaml -f compose.tunnel.yaml stop
```

Para voltar a ligar, rode o `INICIAR` de novo.

Não atualize no meio de uma festa. Guarde o `.env.server` e o volume do banco. Não rode duas cópias do app no mesmo banco, porque a fila só suporta uma instância. Nunca use `down -v`: ele apaga o volume com os dados. Se você trocar a senha no arquivo depois que o banco já existe, a senha do PostgreSQL não muda junto.

Com o link público, qualquer pessoa que tiver o endereço consegue criar uma sala. O app limita a criação a 5 salas por hora para cada IP, e só o anfitrião controla a própria sala.

## Problemas comuns

| O que aparece                                      | O que conferir                                                                                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker não encontrado ou não está rodando          | Docker instalado e aberto. No Linux, `sudo systemctl start docker` ou rode o script com `sudo`.                                                                      |
| O script reclama do `.env.server`                  | A mensagem diz qual campo corrigir.                                                                                                                                  |
| Subiu, mas o endereço não respondeu                | No painel da Cloudflare, o túnel deve aparecer como **Healthy** e o Public hostname deve apontar para `HTTP` `app:3001`. Se o domínio é novo, espere o DNS propagar. |
| A página abre, mas redireciona para outro endereço | O `WEB_ORIGIN` precisa ser igual ao endereço que você digita no navegador.                                                                                           |
| No modo casa, abre no servidor, mas não no celular | Mesma rede, IP certo, firewall liberando a porta e rede de convidados sem isolamento.                                                                                |
| A busca ou os GIFs não funcionam                   | Chaves preenchidas, cota da API, YouTube Data API v3 ativada e internet no servidor.                                                                                 |
| O vídeo não toca ou fica sem som                   | Toque uma vez na TV para liberar o som.                                                                                                                              |

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
```

Depois, rode o `INICIAR` para religar tudo.

## Sem Docker

Precisa de Node 24, pnpm 11.5.0 e um PostgreSQL próprio. Preencha a parte 4 do `.env.server`, com o `DATABASE_URL` certo (escape a senha na URL se ela tiver caracteres especiais). Para o acesso pela internet, rode também o `cloudflared` como serviço apontando para o app e use `TRUST_PROXY=loopback`. Depois:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm start
```

O `pnpm build` lê o `.env.server`, se ele existir, e gera `dist/web` e `dist/server` com a migração SQL junto. O `pnpm start` usa esse mesmo arquivo e roda o JavaScript compilado, sem tsx nem Vite. Para o app voltar sozinho depois de reiniciar a máquina, cadastre-o como serviço do sistema.

## O que já foi testado

O build e a versão compilada foram testados no computador de desenvolvimento, e a validação do `.env.server` dos dois scripts foi testada em Windows e em shell POSIX. **Esse computador não tem Docker, então a subida dos containers e o túnel ainda precisam rodar de verdade no servidor de destino.** TV e celulares de verdade, o som e a leitura do QR também precisam de um teste.
