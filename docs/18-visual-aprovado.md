# Visual A+B aplicado — 09/11/2026

Autorizado após backup. Paleta, tipografia e organização em [DESIGN.md](../DESIGN.md).

## Backup anterior

Pasta: `backups/telas-antes-visual-aprovado-20261109-183233`.

ZIP: `backups/telas-antes-visual-aprovado-20261109-183233.zip`.

Frontend completo anterior (19 arquivos), API, contratos/domínio, testes, README, configurações e lockfile. Conferidos 45 arquivos por SHA-256 dentro do ZIP. Não inclui `.env`, credenciais ou banco. Nenhuma migração ou remoção de dados foi necessária.

Para restaurar, pare frontend/API. Copie `web` sobre `apps/web`, `api` sobre `apps/api`, `packages` sobre `packages`, `tests` sobre `tests` e configurações/README na raiz. Arquivos novos que podem ser removidos explicitamente: `apps/web/src/approved.css`, `apps/web/public/fonts/barlow-1.ttf`, `barlow-2.ttf`, `barlowcondensed-OFL.txt`. O código anterior não os referencia. Preserve `.env` e os dados do PostgreSQL. Campos novos opcionais no JSONB são ignorados pelo código antigo.

## Comportamento

- Celular: música em creme, pedido pessoal rosa, navegação clara, busca, voto, resultado, emojis/GIFs separados. Fontes locais com licença OFL, sem serviço externo de fontes.
- Palco só apresentação: vídeo amplo, música/cantor compactos, QR/fila/GIF à direita, remetente/atribuição e imagem integral. Animações, mascote e movimento reduzido preservados.
- Aba **Palco** exclusiva do anfitrião: fila automática, preparar/pausar/retomar/pular/cancelar, som das notas, reações, GIFs e conexão/reconfiguração. Gerenciar conserva pessoas, entradas e encerramento.
- `SETTINGS` ganhou `scoreSound?: boolean` e `gifDisplay?: normal|expanded|minimized`, validados e restritos ao anfitrião. Defaults para salas anteriores: som ligado e GIF normal. Snapshot e JSONB existentes preservam e sincronizam as escolhas; sem migração.
- Tela cheia nativa exige gesto no navegador da TV; o celular não consegue conceder essa permissão. A área Palco explica TV/F11. O palco já ocupa a janela disponível. Autoplay bloqueado conserva o gesto mínimo de desbloqueio na TV; o som das notas respeita a permissão do AudioContext.

## Validação

Build TypeScript/Vite; regras e PostgreSQL; E2E com banco isolado e contextos de anfitrião, dois celulares e TV. Cobertura de fila automática, voto/bis, reconexão/moderação, pareamento e ajustes remotos de GIF/som/reações. Capturas em `docs/screenshots/`.

Resultado: `pnpm build` aprovado; `pnpm test` com **43 testes** aprovados; `pnpm test:e2e` com **4 cenários** aprovados; `pnpm format:check` aprovado. O integrado confirma comando de GIF pelo celular, persistência da escolha após recarregar o anfitrião, som desativado no snapshot recebido pela TV e ausência de ferramentas de gestão no palco.

Os testes identificam busca/player demo e simulam catálogo/mídia GIPHY; transporte, banco, sessões e regras são reais. A revisão local permanece em integração **real**. Nenhuma simulação foi introduzida no modo real. Esta alteração não repete a homologação externa de YouTube/GIPHY. TV/celulares físicos, autoplay/áudio e leitura à distância continuam como aceite local.

Sem publicação.

Refinamento da tela inicial: os três botões principais têm altura de 54px e larguras iguais. No celular ficam empilhados, ocupando a mesma largura. Conferidos em 320, 390, 768 e 1366px sem transbordamento horizontal; build aprovado.

Refinamento do jogador: buscar/expandir GIFs usa botão âmbar preenchido; minimizar usa rosa, com texto maior, indicador de direção e alvo mínimo de 46px. Em telas estreitas o cabeçalho pode quebrar linha sem comprimir o botão. Confirmações de envio de GIF/emoji usam aviso compacto no canto superior, sem botão de fechar ou bloqueio de toque, desaparecendo após 2,2s. Envios sucessivos renovam o tempo. Falhas continuam como erros explícitos; mensagens de adicionar/remover músicas mantêm o comportamento anterior.

Revisão visual independente: **SHIP**, restrito à implementação local. Capturas de jogador, controles do anfitrião, busca, voto, palco com GIF e resultados inspecionadas sem correções materiais pendentes. A captura 1080p cobre resultado, não reprodução ativa; leitura em TV física e homologação dos fornecedores não foram atestadas por essa revisão. Aviso do detector sobre Inter aceito por ser a fonte aprovada de texto/controles; a identidade dos títulos usa Barlow.
