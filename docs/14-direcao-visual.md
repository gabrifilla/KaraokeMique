# Direção visual 03 — karaokê e festa

Direção escolhida pelo usuário em 08/11/2026, após revisar a proposta de Figma com papel claro, mostarda e vermelho terroso. Referências principais: [Singa](https://singa.com/) para busca, catálogo e fila; [Kahoot!](https://kahoot.com/) para participação pelo celular, contagem regressiva e resultados. A composição é própria, sem reproduzir marcas ou telas desses produtos.

## O que foi aplicado

- Base azul noturna `#0D1228`, superfícies `#171E38` e linhas `#303B5D`.
- Ações em magenta `#DA2464`; realces em rosa `#FF70A7` e ciano `#61DDF2`.
- Títulos em **Nunito Sans 800/900** e leitura em **Inter 400/600/700**, com fontes hospedadas no próprio projeto.
- Marca com microfone vetorial, ícones consistentes e navegação com rótulos explícitos.
- Entrada com prévia ilustrativa de sala e mascote original; criação e convite com formulário em destaque.
- Busca em cartões de música com miniatura, canal, duração e ação de adicionar; fila em linhas numeradas e separadores.
- Votação com contador circular e onze botões grandes, de 0 a 10. As cores agrupam opções, mas número, foco e seleção continuam explícitos. Não há nota pré-selecionada.
- Resultado com média grande, tratamento de celebração e oferta de bis identificada.
- Palco com vídeo dominante e QR em superfície branca, com código e instrução de entrada. A [revisão posterior do usuário](15-palco-e-identidade.md) retirou o header, compactou o QR, moveu GIFs para a lateral e adotou emojis em overlay, substituindo a faixa de reações desta proposta inicial.

As regras, endpoints, autenticação, limites de integração e algoritmos de pontuação não foram alterados nesta revisão visual. A prévia da página inicial é identificada como ilustrativa; não apresenta uma sala fictícia como conexão real.

## Verificação

Build TypeScript/Vite, checagem de formatação e os 32 testes de domínio, adaptador e banco foram executados. O E2E multicliente verifica criação, entrada, busca/fila, playback, pausa/retomada, voto, bis, reconexão, falha técnica, transferência e encerramento. A revisão acrescentou verificação de separação geométrica do QR e player e palco em 1920×1080, além de 1280×720 e expansão.

`pnpm exec tsx scripts/visual-review.ts` captura início, criação e entrada, verifica fontes e ausência de overflow horizontal em 360, 390 e 1440 px. [Resultado das 9 combinações](visual-review-result.json). O script requer o servidor local na porta 5173.

Prévia atual: [início desktop](screenshots/home-1440.png), [início celular](screenshots/home-390.png), [criar sala](screenshots/create-390.png), [busca](screenshots/search.png), [votação](screenshots/vote.png), [palco 720p](screenshots/stage.png), [palco 1080p](screenshots/stage-1080p.png).

A prova de integração real foi repetida após o redesenho: busca YouTube com 12 resultados, PLAYING, busca GIPHY com 12 resultados, resolução de GIF por ID com imagem carregada e ENDED real após seek técnico para os segundos finais. [Evidência](real-spike-result.json). Não equivale a piloto físico, auditoria integral de acessibilidade ou publicação.

## Situação do Figma

O [arquivo das 21 telas anteriores](https://www.figma.com/design/qH5qqpfUtOrRoEhdFmy871?node-id=6-176) continua disponível como histórico. A tentativa de atualização retornou: “You've reached the Figma MCP tool call limit on the Starter plan.”

**A direção 03 foi aplicada na aplicação local, mas ainda não foi sincronizada com o Figma.** A fonte atual é o código e as capturas deste relatório. A sincronização das camadas editáveis depende da liberação da cota; não houve contratação ou upgrade. A direção 02 em `design/README.md` e nos scripts de construção foi preservada como proposta histórica, não como identidade atual.
