# Karaoke Míque — direção aprovada

Festa entre amigos/família: celular como controle, TV como apresentação. A+B aprovado, com fila na direita acima dos GIFs: [prévia](docs/design-review-v3/images/a-stage.png).

| Papel | Valor |
| --- | --- |
| Fundo | Carvão quente `#191519` |
| Superfícies | `#2b232b`, `#3b2b35` |
| Leitura em destaque | Creme `#fff4e4`, texto `#36212e` |
| Ações e pedido pessoal | Rosa `#ff85ad`, texto `#301321` |
| Acentos e seleção | Âmbar `#ffd166` |
| Texto secundário | `#cdbdc9` no escuro, `#715967` no creme |
| Títulos | Barlow Condensed 700/800 local, OFL |
| Texto e controles | Inter |

Cor viva concentrada em detalhes, sem campos azuis. Tipografia marcante, divisórias simples, cantos 12–16px, sem sombras duras. Nome Karaoke Míque; slogan Solta a voz, pede Bis. Mascote e reações existentes preservados.

Celular: conteúdo até 480px, navegação inferior creme, música atual em painel claro e pedido pessoal rosa integrado. Emojis e GIFs separados, busca minimizável. Fila global apenas no palco. Busca, notas, resultado animado, moderação, erros e reconexão mantêm suas funções.

Palco: sem cabeçalho da marca ou gestão. Vídeo amplo, identificação compacta superior; QR, fila e GIF com remetente na direita. GIF usa contain, QR não é coberto na ampliação. Resultados ocupam o espaço principal mantendo a lateral. Emojis em overlay.

Anfitrião: todos os ajustes do palco na aba Palco, sincronizados pelo servidor. Tela cheia nativa e liberação inicial de áudio podem exigir gesto na própria TV. Botões de simulação somente em demo. Folha visual `apps/web/src/approved.css`, carregada após as anteriores.

[Implementação e restauração](docs/18-visual-aprovado.md).

Mascote v3: cinco dedos por mão, bustos na marca/título/passos e poses completas nas boas-vindas/resultados. Rodapé global fora da apresentação do palco. [Decisões e validação](docs/23-mascote-e-copyright.md).
