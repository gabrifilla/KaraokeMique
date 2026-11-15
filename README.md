# Karaoke Míque

**Solta a voz, pede Bis**

Karaoke Míque é um karaokê pra festa em casa. Uma TV ou um computador vira o palco, e cada pessoa usa o próprio celular como controle: entra na sala pelo QR code, busca a música no YouTube, entra na fila e, quando alguém termina de cantar, dá uma nota de 0 a 10. Quem tirar 10 de todo mundo pode pedir bis. Durante a música dá pra mandar emojis e GIFs, que aparecem no palco, e o mascote reage à nota no final.

A fila dá a vez a quem cantou menos, então ninguém monopoliza o microfone. O anfitrião controla a festa pelo celular: pausa, pula, cancela uma música que deu problema, remove gente e fecha a sala.

O projeto usa React, TypeScript e Vite no front, NestJS com Socket.IO na API e PostgreSQL com Drizzle no banco. Ainda não está publicado em lugar nenhum.

## Rodar no seu computador

Você precisa do Node 24 e do pnpm 11.5.0. Se o pnpm não estiver instalado, rode `corepack enable` e `corepack prepare pnpm@11.5.0 --activate`.

```powershell
pnpm install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm db:local
```

O `pnpm db:local` sobe um PostgreSQL de verdade, guardado em `.data/postgres` e ouvindo em `127.0.0.1:54329` (banco `karaoke_dev`, usuário e senha `karaoke`). Ele não instala nenhum serviço no sistema, e o Ctrl+C desliga o banco sem perder os dados. Se o banco já estiver rodando, o comando só confirma a conexão e termina. Se preferir outro PostgreSQL, aponte o `DATABASE_URL` para ele ou use o [Docker Compose](infra/compose.yaml) com `POSTGRES_PASSWORD` definido. Só não suba os dois na mesma porta.

Com o banco no ar, abra outro terminal:

```powershell
pnpm dev
```

Abra [localhost:5173](http://localhost:5173) e crie uma sala. O botão **Conectar TV ou abrir palco** aparece logo no começo, e o menu do anfitrião ganha a aba **Palco**. Para testar tudo numa máquina só, use **Usar esta tela como palco**.

### Conectar a TV

Na TV, abra o site e escolha **Usar como palco**. Ela mostra um QR code e um código de 6 dígitos. O anfitrião escaneia o QR com o celular e confirma a sala, ou digita o código em **Palco → Conectar TV**. Ninguém precisa digitar nada na TV.

O código de 6 dígitos vale por cinco minutos, fica preso ao navegador daquela TV e só o anfitrião pode aprovar. Se precisar, ainda existe o código autorizado de 24 caracteres em **Palco → Outras formas de conectar**, que expira em dois minutos e só funciona uma vez.

O palco e os participantes usam cookies diferentes, então dá pra abrir os dois em abas do mesmo navegador. Para simular pessoas diferentes, use perfis separados: abas do mesmo perfil são a mesma pessoa.

### Atalho de desenvolvimento

Com `pnpm dev`, a API roda em `NODE_ENV=development` e libera um atalho em **Palco → Outras formas de conectar → Abrir palco de desenvolvimento**: a sala já vem preenchida e qualquer código de palco serve (por exemplo, `teste`). Se abrir `/stage/pair` direto, informe também o código de 8 caracteres da sala, para não conectar na sala errada quando houver várias abertas.

Em produção, em teste ou rodando `pnpm start:api` sem definir o ambiente, esse atalho não existe e a API exige o código autorizado de 24 caracteres. Quem decide isso é o servidor, não o front.

### Testar com celulares na rede de casa

Use um endereço com nome, não o IP direto: o YouTube recusou alguns vídeos quando o player foi aberto pelo IP. Com o banco rodando e as portas 5176 e 3004 livres:

```powershell
./scripts/start-lan.ps1
# Se houver mais de uma interface de rede:
./scripts/start-lan.ps1 -Address 192.168.0.122
```

O script sobe a API e o front e mostra um endereço como `http://karaoke.192.168.0.122.sslip.io:5176`. Abra esse mesmo endereço no computador e nos celulares. O `sslip.io` só resolve o nome para o seu IP; o tráfego continua dentro da rede. Se você trocar do IP para o nome, crie uma sala nova e conecte o palco de novo, porque os cookies ficam presos ao endereço antigo.

Libere a porta no firewall se precisar e deixe todos os aparelhos na mesma rede (`localhost` no celular aponta para o próprio celular). HTTP serve para testar em casa. Para publicar, só com HTTPS.

### Abrir para quem está fora da rede

Para gente de fora da sua rede entrar, o projeto tem um túnel temporário da Cloudflare com HTTPS. Ele roda a versão compilada, com um banco separado (`karaoke_public`):

```powershell
pnpm build
node scripts/public-tunnel.mjs
```

O terminal mostra o endereço público, que muda a cada vez que o túnel é recriado. Os detalhes estão em [acesso público temporário](docs/24-acesso-publico-temporario.md).

## YouTube, GIPHY e modo demonstração

O [.env.example](.env.example) já vem em modo `real`. Coloque uma `YOUTUBE_API_KEY` de um projeto com a YouTube Data API v3 ativada e uma `VITE_GIPHY_API_KEY` de um app do GIPHY. A chave do YouTube fica só no servidor. A do GIPHY vai junto no código do site, porque é assim que o GIPHY funciona para apps web. Para usar o GIPHY em produção, confira as condições comerciais deles. Nunca suba o `.env` para o Git.

Sem a chave do YouTube, a busca avisa que está indisponível e não mostra resultado nenhum. Para revisar o app sem chaves, troque para `INTEGRATION_MODE=demo` no `.env` e reinicie. A demonstração tem três músicas de mentira e simula o início da música; o fim e a falha são botões manuais, sem áudio nem vídeo. Salas, banco, fila, votos e sockets continuam funcionando de verdade, e a tela avisa que é uma demonstração. Os GIFs não têm versão simulada: sem chave, só emojis. A API recusa o modo demo com `NODE_ENV=production`.

Quando a próxima música é preparada, o palco tenta começar com som assim que o YouTube carrega. Se o navegador bloquear o autoplay com áudio, aparece **Ativar som e iniciar** no palco. Pausas e recuperações nunca voltam a tocar sozinhas. O autoplay foi confirmado no Chromium com o YouTube real; em outros navegadores e aparelhos depende da permissão de áudio.

**Tocar fila automaticamente** já vem ligado. Com o palco conectado, o servidor prepara a primeira música e as seguintes sem o anfitrião clicar em nada. O resultado fica pelo menos cinco segundos na tela, e uma oferta de bis espera até dez segundos pela resposta. Se um vídeo falhar na validação ou for cancelado por problema técnico, o automático para e as outras músicas continuam na fila. O anfitrião liga e desliga isso na aba Palco.

Ao abrir **Buscar**, aparecem ideias de músicas tiradas do YouTube, alternando entre 16 temas como pop, rock, emo, pop punk e grunge. **Outras ideias** troca o tema. Cada tema fica 24 horas em cache para economizar cota da API. As ideias são iguais para todo mundo, não personalizadas. [Mais detalhes](docs/19-sugestoes-de-musicas.md).

A [prova técnica](docs/10-prova-tecnica.md) veio antes de tudo. Sem credenciais, o YouTube respondeu 403 e o GIPHY 401. Com as chaves configuradas, busca, início e fim do player e envio de GIF funcionaram no Chromium ([evidência](docs/real-spike-result.json)). Áudio e aparelhos físicos ainda precisam de um teste de verdade.

## Testes

Com o PostgreSQL local rodando:

```powershell
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm spike
```

Os testes de banco criam uma base `karaoke_test_<uuid>` e apagam no final, então o usuário de desenvolvimento precisa da permissão `CREATEDB`. Nunca rode contra produção. Os testes e2e fazem o mesmo com `karaoke_e2e_<uuid>` e sobem a própria API e o próprio front em modo demo nas portas 3002 e 5174, sem encostar nas suas salas. Eles simulam celulares e TV em contextos separados do Chromium e salvam capturas em `docs/screenshots/`. Rode só uma API por banco, porque o worker da fila não suporta mais de uma instância.

`pnpm exec tsx scripts/load.ts` cria e apaga salas de teste com 620 sockets locais ([resultado](docs/load-result.json)). `pnpm exec tsx scripts/player-spike.ts` tenta carregar o player real num Chromium sem janela e grava o resultado em [player-spike-result.json](docs/player-spike-result.json). Nenhum dos dois substitui um teste com TV, som e celulares de verdade.

## Instalar num servidor de casa

O [guia de instalação](INSTALAR.md) explica como subir tudo com Docker usando o `compose.server.yaml`, com front e API compilados, PostgreSQL persistente e scripts para Linux e Windows. O `pnpm build` gera `dist/web` e `dist/server`, e o `pnpm start` roda essa versão lendo o `.env.server`, sem precisar do Vite. A versão compilada foi testada; o Docker ainda precisa rodar de verdade no servidor de destino.

## Documentação

O app tem um [tutorial](http://localhost:5173/tutorial), aberto pelo botão **Ainda não conseguiu? → Ver tutorial completo** ao lado de Como funciona. No servidor, é o endereço configurado com `/tutorial` no final ([como foi feito](docs/22-tutorial-de-uso.md)).

- Especificação: [produto](docs/01-produto.md), [regras](docs/02-regras-do-jogo.md), [telas](docs/03-experiencia-e-telas.md), [arquitetura](docs/04-arquitetura.md), [dados e contratos](docs/05-dados-e-contratos.md), [integrações](docs/06-integracoes.md), [qualidade](docs/07-qualidade-e-operacao.md).
- Entrega: [plano original](docs/08-plano-de-entrega.md), [propostas originais](docs/09-decisoes-e-melhorias.md), [prova técnica](docs/10-prova-tecnica.md), [decisões e desvios](docs/11-decisoes-implementacao.md), [validação por etapa](docs/12-validacao.md), [operação](docs/13-operacao.md).
- [Mascote original](assets/mascot/README.md), com a cópia usada no front.
- [Visual A+B aprovado, backup e controles do palco](docs/18-visual-aprovado.md).
- [Direção visual anterior, inspirada no Singa e no Kahoot](docs/14-direcao-visual.md), com prévias de celular, catálogo, votação e palco.
- [Palco focado na música e identidade Karaoke Míque](docs/15-palco-e-identidade.md), com emojis por cima do vídeo e GIFs na lateral.
- [Fila automática, GIFs e conexão mais fácil da TV](docs/16-fila-automatica-e-tv.md).
- [Revelação animada da nota, som e reações do mascote](docs/17-revelacao-da-nota.md), incluindo as frases e o caso em que ninguém vota.

As regras propostas viraram o padrão, e dá pra mudar depois. Quem cantou menos vai antes e, entre os pedidos da mesma pessoa, o mais antigo sai primeiro. A nota é um número inteiro e ninguém vota em si mesmo. O bis exige 10 de todo mundo, com pelo menos dois votos, e vale para uma música que já está na fila. Depois de um bis, a pessoa precisa esperar quatro músicas terminarem para ganhar outro. O resultado fica pelo menos 5 segundos na tela. Os limites estão no registro de decisões.

## O que ainda falta

O projeto está pronto para uso em casa. Antes de virar produção, faltam: aprovação, custos e cotas das APIs, testar autoplay e áudio em aparelhos reais, Safari e iOS, ler o QR de longe, uma festa de teste com seis pessoas e restaurar um backup. A etapa 6 ainda não foi liberada para produção.
