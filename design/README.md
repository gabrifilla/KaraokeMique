# Solta a Voz — direção visual 02

> Proposta histórica, substituída pela [direção visual 03 — Singa e Kahoot](../docs/14-direcao-visual.md), já aplicada à aplicação. Este arquivo Figma ainda não recebeu a revisão por limite de cota do MCP.

[Arquivo editável no Figma](https://www.figma.com/design/qH5qqpfUtOrRoEhdFmy871?node-id=6-176). Página **01 · Solta a Voz / proposta**. Criado pelo MCP em 08/11/2026. Não é uma alteração já aplicada ao visual da aplicação.

## Direção

Referências de linguagem: cartaz de show independente e ficha de pedido de música de bar. Hierarquia por escala de texto e separadores, fundos planos, contraste forte e poucos tratamentos de superfície. O celular usa papel claro e vermelho; o palco usa carvão e amarelo, preservando a legibilidade distante. O mascote original entra nas boas-vindas e no ingresso da entrada.

- Display: Barlow Condensed Black/Bold.
- Corpo: Inter, preservando a família do produto e a base Simple Design System.
- Códigos e índices: IBM Plex Mono.
- Paleta: papel `#F4F0E7`, tinta `#23231F`, vermelho `#B93E28`, amarelo `#E4C15C`, palco `#171A17`.

## Entrega

21 telas: 15 móveis (início, criação, convite, sala, busca, confirmação, fila, reações, voto, resultado/bis do cantor, pessoas, pareamento, GIFs, resumo e resultado da plateia); entrada desktop; cinco estados de palco (lobby, apresentação, votação, resultado e recuperação).

Telas construídas com texto editável, auto layout, variáveis de cor/espaçamento, instâncias de Button/Input da biblioteca Simple Design System e componentes locais SongRow/MobileNavigation. Ligações entre as principais telas foram criadas. O protótipo não executa o backend: seleção de nota, dados e reações são exemplos de composição, não uma sessão real.

O mascote é a imagem original capturada do projeto, não uma imagem nova. O QR é um SVG editável gerado com o mesmo componente `qrcode.react`; aponta para endereço ilustrativo `example.com` e não cria sala real. A área de vídeo é reservada para o IFrame na implementação. Os blocos da busca GIF indicam composição; não se apresentam como mídia fornecida pelo GIPHY.

## Validação e limites

As 14 telas móveis iniciais foram inspecionadas estruturalmente: texto, componentes e hierarquia, com imagem raster apenas para o mascote. A auditoria detectou excesso de conteúdo em algumas telas e o espaçamento entre seções foi reduzido de 24 para 16 px. As fontes retornadas foram Inter, Barlow Condensed e IBM Plex Mono.

Após compor desktop e palco, foram exportadas e conferidas as imagens de [sala móvel](previews/mobile-room.png), [entrada desktop](previews/desktop-home.png) e [palco](previews/stage.png). Nessas composições, texto e controles estão legíveis, sem sobreposição; o QR tem coluna própria e as reações ficam abaixo do vídeo.

O MCP retornou **limite de chamadas do plano Starter** na auditoria final das 21 telas. Portanto, a revisão visual completa das outras telas, auditoria final de todos os vínculos/tokens e exclusão da captura temporária na página inicial do arquivo permanecem pendentes. A captura é referência da versão anterior; não integra as novas telas. Não foi solicitado upgrade ou contratação.

## Arquivos de apoio

`figma-foundation.js`, `figma-mobile.js` e `figma-desktop.js` registram a construção via Plugin API; IDs são deste arquivo Figma e não devem ser reaplicados cegamente. `__QR_SVG__` no script desktop é substituído pelo conteúdo serializado de `assets/invite-qr.svg` antes da execução no MCP.

`scripts/export-figma-assets.ts` exporta o QR ilustrativo. O script de captura no HTML do projeto fica restrito a desenvolvimento com hash `figmacapture`, sem execução no build de produção. Nenhuma geração adicional de imagens ou crédito de Figma AI foi utilizado.
