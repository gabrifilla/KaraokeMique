# Karaoke Míque

**Solta a voz, pede Bis**

Aplicação local com React/TypeScript/Vite, NestJS/Socket.IO e PostgreSQL/Drizzle. Salas por QR, celulares como controles, palco pareado, busca YouTube, fila justa, votação até 10 segundos, bis, emojis/GIFs, mascote, administração e reconexão. Não publicada.

## Rodar localmente

Para **instalar em um servidor da casa**, use o [guia de instalação](INSTALAR.md) e `compose.server.yaml`: frontend/backend compilados, PostgreSQL persistente e scripts para Linux/Windows. `pnpm build` agora gera `dist/web` e `dist/server`; `pnpm start` executa o build usando `.env.server`. Docker ainda precisa de execução no host de destino; o runtime compilado foi validado separadamente. Não é necessário usar Vite no servidor.

Requisitos: Node 24 e pnpm 11.5.0. Use `corepack enable` e `corepack prepare pnpm@11.5.0 --activate` se necessário.

```powershell
pnpm install --frozen-lockfile
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
pnpm db:local
```

O último comando mantém um PostgreSQL **real**, isolado em `.data/postgres`, em `127.0.0.1:54329`. Banco `karaoke_dev`, UTF-8; usuário/senha locais `karaoke`. Não instala serviço global. Ctrl+C encerra preservando dados. Alternativa: PostgreSQL próprio por `DATABASE_URL` ou [Docker Compose](infra/compose.yaml) com `POSTGRES_PASSWORD` no ambiente; não inicie os dois na mesma porta.

Se esse PostgreSQL local já estiver ativo, `pnpm db:local` verifica a conexão e informa que pode ser reutilizado, sem iniciar outra instância nem interromper a existente. Nesse caso o comando termina normalmente; mantenha o processo original do banco em execução e siga com `pnpm dev`. Falhas de inicialização exibem o diagnóstico do PostgreSQL em vez de apenas `undefined`.

Em outro terminal:

```powershell
pnpm dev
```

Abra [localhost:5173](http://localhost:5173). Ao criar a sala, **Conectar TV ou abrir palco** fica em destaque; o menu do anfitrião tem **Palco**. Use **Usar esta tela como palco** para abrir com um toque. Na TV, abra o início e escolha **Usar como palco**: ela mostra um QR e um código de 6 dígitos. Escaneie o QR com o celular do anfitrião e confirme a sala; alternativamente, informe o código da TV em **Palco → Conectar TV** no celular. Nada precisa ser digitado na TV.

O código de 6 dígitos é um pedido de autorização com validade de cinco minutos, vinculado ao navegador da TV; somente o anfitrião pode autorizá-lo. O pareamento por código autorizado de 24 caracteres continua em **Palco → Outras formas de conectar**, com expiração de dois minutos e uso único. Palco e membro usam cookies diferentes e podem ocupar abas do mesmo navegador. Para pessoas diferentes, use perfis/contextos separados; abas do mesmo perfil compartilham identidade.

Com `pnpm dev`, a API assume `NODE_ENV=development` quando o ambiente não foi definido. Nesse ambiente, em **Palco → Outras formas de conectar → Abrir palco de desenvolvimento**, a sala já vem preenchida e você pode digitar qualquer código de palco não vazio (por exemplo, `teste`). Abrindo `/stage/pair` diretamente, informe também o código de 8 caracteres da sala. A sala explícita evita conectar à sala errada quando há várias abertas; não é necessário gerar autorização temporária nesse atalho. O pareamento substitui o palco anterior e continua recusando salas encerradas.

O atalho só existe com `NODE_ENV=development` na API. Em produção (`NODE_ENV=production`), em teste ou com ambiente ausente no comando `pnpm start:api`, a API exige o código autorizado de 24 caracteres, com expiração e uso único, mesmo que o cliente tente enviar uma sala. O fluxo estrito também permanece disponível em dev ao deixar o campo da sala vazio. A configuração é consultada no servidor; não depende do modo do bundle frontend nem de `INTEGRATION_MODE`.

Para celulares na rede local, use um endereço com nome: alguns vídeos reais foram recusados pelo YouTube quando o embed foi aberto diretamente pelo IP. Com o banco ativo e as portas 5176/3004 livres, execute no PowerShell:

```powershell
./scripts/start-lan.ps1
# Se houver mais de uma interface de rede:
./scripts/start-lan.ps1 -Address 192.168.0.122
```

O script inicia API e frontend, configura `WEB_ORIGIN` e exibe um endereço como `http://karaoke.192.168.0.122.sslip.io:5176`. Abra **esse endereço no computador e nos celulares**. O domínio `sslip.io` fornece somente DNS para o IP informado: a aplicação continua na rede local, sem túnel ou publicação. O QR usa essa origem. Vite permite somente o hostname configurado adicionalmente aos hosts locais padrão e redireciona navegações HTML de outros endereços para a origem configurada. Ao trocar de IP para hostname, crie uma sala nova para o teste e pareie o palco novamente, pois os cookies pertencem ao host anterior.

Permita a porta web no firewall se necessário e mantenha os aparelhos na mesma rede. `localhost` no celular aponta para o próprio celular. HTTP é apenas para ensaio local; publicação exige HTTPS. Para iniciar manualmente, configure `WEB_ORIGIN` com o hostname da rede e as portas correspondentes antes de `pnpm dev`.

## Integrações e demonstração

O padrão de [.env.example](.env.example) é `real`. Configure `YOUTUBE_API_KEY` em projeto com YouTube Data API v3 habilitada e `VITE_GIPHY_API_KEY` em aplicação GIPHY. A primeira chave fica apenas no servidor; a segunda é chave de integração web exposta no bundle por desenho do fornecedor. Produção GIPHY exige verificar aprovação/condições comerciais. Nunca versionar `.env`.

Sem chave, a busca real informa indisponibilidade; **não inventa resultados**. Para revisar sem fornecedores, mude `INTEGRATION_MODE=demo` no `.env` e reinicie. O modo demo tem três músicas fictícias e simula o início automático; término e falha têm controles manuais, sem áudio/vídeo real. Salas, sessões, banco, fila, votos e sockets continuam reais. A interface identifica a demonstração. GIFs não são simulados: sem chave, use emojis. Demo é recusado com `NODE_ENV=production`.

Ao preparar a próxima música, o palco tenta iniciar com som assim que o YouTube fica pronto, sem exigir outro clique para tocar. Se o navegador bloquear o autoplay com áudio, aparece **Ativar som e iniciar** no palco. Pausas e recuperação não reiniciam sozinhas. O teste integrado com YouTube real confirmou reprodução automática em Chromium; a permissão de áudio depende do navegador/dispositivo.

**Tocar fila automaticamente** vem ativado. Com palco conectado, a primeira música elegível e as próximas são preparadas pelo servidor sem clique do anfitrião. Resultados permanecem por pelo menos cinco segundos; uma oferta de bis aguarda decisão por até dez segundos. Pausa e recuperação não são retomadas automaticamente. Falha de validação ou cancelamento técnico interrompe o automático e preserva as outras músicas. O anfitrião pode desligar/reativar o controle na aba Palco.

A [prova técnica](docs/10-prova-tecnica.md) foi executada primeiro. Busca real YouTube retornou 403 e GIPHY 401 sem credenciais. Após configuração local das chaves, busca, início/término do player e busca/envio de GIF real foram comprovados em Chromium. Veja [evidência integrada](docs/real-spike-result.json); áudio e aparelhos físicos ainda precisam de ensaio. Não há contratação nem publicação.

## Validação

Ao abrir **Buscar**, aparecem ideias vindas de resultados reais do YouTube, alternando entre 16 temas: pop, rock, emo, pop punk, grunge e outros. **Outras ideias** troca o tema; você pode adicionar diretamente ou pesquisar. Cache compartilhado de 24 horas por tema reduz o consumo de cota. Não são recomendações personalizadas. Sem chave ou com falha, há aviso, sem inventar vídeos. [Detalhes e validação](docs/19-sugestoes-de-musicas.md).

Com o PostgreSQL local aberto:

```powershell
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
pnpm spike
```

Os testes de banco criam uma base isolada `karaoke_test_<uuid>` e a removem; a credencial de desenvolvimento precisa de `CREATEDB`. Nunca executar contra produção. E2E também cria uma base isolada `karaoke_e2e_<uuid>`, removida no teardown, e inicia sua própria API/web em demo nas portas 3002/5174. Não compartilha salas nem worker com a revisão local. Exercita celulares e TV em contextos Chromium separados e grava capturas em `docs/screenshots/`. Mantenha apenas uma instância de API por banco: o worker/outbox atual é de instância única.

`pnpm exec tsx scripts/load.ts` cria/remove salas de teste e exercita 620 sockets locais; evidência em `docs/load-result.json`. `pnpm exec tsx scripts/player-spike.ts` tenta carregar o player real em Chromium headless e registra `docs/player-spike-result.json`. Isso não substitui dispositivos físicos, som da TV ou fornecedores reais aprovados.

## Documentação

- [Tutorial dentro da aplicação](http://localhost:5173/tutorial): botão **Ainda não conseguiu? → Ver tutorial completo** junto de Como funciona. No servidor, use `/tutorial` no endereço configurado. [Registro da implementação](docs/22-tutorial-de-uso.md).

- Especificação: [produto](docs/01-produto.md), [regras](docs/02-regras-do-jogo.md), [telas](docs/03-experiencia-e-telas.md), [arquitetura](docs/04-arquitetura.md), [dados/contratos](docs/05-dados-e-contratos.md), [integrações](docs/06-integracoes.md), [qualidade](docs/07-qualidade-e-operacao.md).
- Entrega: [plano original](docs/08-plano-de-entrega.md), [propostas originais](docs/09-decisoes-e-melhorias.md), [prova técnica](docs/10-prova-tecnica.md), [decisões implementadas e desvios](docs/11-decisoes-implementacao.md), [validação por etapa](docs/12-validacao.md), [operação](docs/13-operacao.md).
- [Mascote original](assets/mascot/README.md) preservado; cópia usada no frontend.
- [Visual A+B aprovado, backup e controles do palco](docs/18-visual-aprovado.md).
- [Direção visual anterior — Singa e Kahoot](docs/14-direcao-visual.md), com prévias de celular, catálogo, votação e palco.
- [Palco focado na música e identidade Karaoke Míque](docs/15-palco-e-identidade.md), com emojis em overlay e GIFs na lateral.
- [Fila automática, GIFs e conexão facilitada da TV](docs/16-fila-automatica-e-tv.md), com as decisões e fluxos atuais.
- [Revelação animada da nota, som e expressões do mascote](docs/17-revelacao-da-nota.md), incluindo frases e caso sem votação.

As regras propostas foram adotadas como padrões revisáveis: menos turnos e FIFO por pessoa; voto inteiro sem autovoto; unanimidade exata com ≥2 votos para bis de música já pendente; cooldown de quatro músicas concluídas após cada bis; resultado por ao menos 5 segundos. Detalhes e limites estão no registro de decisões.

Preparada para revisão local. Aceites externos ainda incluem aprovação/custos/quotas de produção, autoplay/áudio em aparelhos, Safari/iOS, QR a distância, piloto físico com seis pessoas e restauração de backup. A etapa 6 não está liberada para produção.
