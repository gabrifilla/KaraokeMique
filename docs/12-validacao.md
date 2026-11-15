# Acompanhamento e validação — 08/11/2026

Atualização de 09/11/2026: visual A+B aplicado após backup verificado. **43 testes de regras/banco**, **4 cenários E2E**, build e formatação aprovados. [Registro desta entrega e restauração](18-visual-aprovado.md). As contagens anteriores abaixo registram as entregas originais.

Relatório de revisão local, sem publicação. O aceite completo depende das verificações externas indicadas. “Implementado localmente” não equivale a lançamento aprovado.

| Etapa | Entrega e validação realizadas | Aceite restante |
| --- | --- | --- |
| 0 — Prova técnica | Executada primeiro; HTTP YouTube/GIPHY e script IFrame; [evidência](spike-result.json), [tentativa Chromium](player-spike-result.json), [relatório](10-prova-tecnica.md) | Pesquisa, PLAYING/ENDED e GIF reais comprovados em revalidação com chaves locais; faltam áudio/aparelhos, custos e aprovação de produção |
| 1 — Fundação e UX | SPA navegável, tokens, mascote, contratos Zod, banco UTF-8, migração SQL idempotente, build e TypeScript aprovados | Revisão humana de linguagem/visual; acessibilidade completa em aparelhos |
| 2 — Salas e palco | E2E com anfitrião, dois celulares simulados e palco; QR, cookies separados, uso único/expiração do pareamento, epoch, reconexão e isolamento | Três celulares físicos, escaneamento e distâncias reais |
| 3 — Busca/fila/player | Adaptador real de busca/metadados; testes de parâmetros, cache e falha; fila e player demo E2E; skip, cancelamento e recuperação no domínio | Busca e player reais comprovados em Chromium; falta aparelho físico com som |
| 4 — Voto e bis | Votos concorrentes no PostgreSQL; deadline no limite; zero votos, voto zero, média exata vs arredondamento, oferta existente, bis único, moderação e encerramento; E2E de nota perfeita e aceite | Ensaio físico e reinício de processo API no meio de sessão real |
| 5 — Reações/moderação | Emoji chega ao palco no E2E; GIPHY direto do cliente, busca/paginação, ID e rating no receptor, limite e expiração; transferência e encerramento E2E | Busca e mídia GIPHY reais comprovadas; faltam revisão de atribuição gráfica/analytics e medição comercial |
| 6 — Beta | Ensaio curto 620 sockets/heartbeats, falhas simuladas, capturas revisadas, CI e runbook preparados | Carga sustentada, piloto ≥6 pessoas, Safari/iOS, restauração de dump, monitoramento/alertas, políticas e revisão final. **Beta não liberado** |

## Verificações automatizadas

- `pnpm build`: TypeScript estrito e bundle Vite.
- `pnpm test`: 32 testes em 3 arquivos, cobrindo domínio, adaptador YouTube com HTTP mockado e banco PostgreSQL real isolado.
- `pnpm test:e2e`: dois cenários Chromium; quatro contextos para sessão completa, pausa/retomada, recarga do palco, modo expandido e QR integralmente dentro da viewport, além de requests autenticados para CSRF, isolamento, escopo de palco, troca/uso único do pareamento.
- [Ensaio de carga](load-result.json): 620/620 primeiros snapshots, zero falhas de conexão, p95 inicial 180ms; 620/620 ACKs no lote de heartbeat em 1177ms. São medidas locais curtas, sem carga sustentada ou mídia externa; não demonstram as metas gerais de SLA.

O teste de banco cria uma base temporária com prefixo controlado `karaoke_test_`, usa locks/replays/rollback reais e a remove após o teste. Uma segunda instância do repositório lê o mesmo prazo/voto e fecha a rodada no deadline original. O worker da aplicação de desenvolvimento não consome a outbox dessa base de teste.

As respostas do YouTube mockadas são usadas **somente nos testes de adaptador**. O modo demo é separado e identificado na interface; não é evidência de viabilidade de fornecedor. A tentativa inicial do player real Chromium não recebeu READY/PLAYING em 30s. Na revalidação pela aplicação, com chaves locais configuradas, houve busca de 12 vídeos, PLAYING, busca de 12 GIFs, resolução por ID/mídia carregada no palco e ENDED real após seek técnico para os segundos finais. [Evidência atual](real-spike-result.json). O seek é procedimento de prova, não recurso do aplicativo. Áudio físico, autoplay em aparelhos e apresentação integral permanecem para o piloto.

## Evidências visuais

[Palco](screenshots/stage.png) e [celular](screenshots/mobile.png), gerados pelo E2E. A [direção visual 03](14-direcao-visual.md), inspirada em Singa e Kahoot, foi aplicada após a revisão do usuário. A [revisão Karaoke Míque](15-palco-e-identidade.md) ampliou o vídeo, retirou o header e colocou emojis em overlay com GIFs na lateral. O QR tem região própria e não é sobreposto; o overlay de emojis não captura cliques. 1280×720, 1920×1080 e modo expandido foram verificados automaticamente; leitura física do QR segue para o piloto. A navegação oculta ícones decorativos do nome acessível e o fluxo suporta teclado, foco visível e movimento reduzido. Não foi realizada auditoria WCAG integral.

## Limites técnicos conhecidos

Agregado JSONB por sala em vez de tabelas por entidade; invariantes de voto no domínio, dentro do lock. Uma única API. Logs de erros e ensaio de carga presentes, mas coleta contínua de métricas/alertas e error tracking externos não provisionados. Endpoints e esquemas executáveis são a referência implementada: mutações duráveis usam `/commands` em vez das rotas individuais originalmente propostas. Revogar uma sessão removida bloqueia reentrada com o mesmo cookie, mas a identidade anônima não impede usar outro perfil.
