# A + B — nova prévia

Pedido: combinar A e B, removendo o azul dominante e aproximando a paleta de uma festa. Esta pasta é uma nova proposta, ainda sem aplicação definitiva.

- Do A: letras condensadas, contraste, música dominante no palco, fila horizontal inferior.
- Do B: painel claro da música no celular, pedido integrado, formas arredondadas e navegação clara.
- Nova paleta: carvão quente de fundo; creme nas áreas de leitura; rosa em ações/pedidos; âmbar nas reações, seleção de nota e detalhes. Nenhuma cor saturada ocupa a tela inteira.

Os sete estados são exemplos com dados fictícios: jogador, palco, busca, votação, resultado, minhas músicas e pessoas. Player e GIF ilustrativos; QR sem sala real. Navegação, expansão/minimização da busca de GIFs e seleção de nota são locais. Demais botões informam que são prévias. Não há chamadas ao backend, YouTube ou GIPHY.

Criação/entrada de salas, administração, pareamento, reconexão, falhas, fila automática/justa, votação em até 10 segundos, média, bis, ausência de votos e demais expressões do mascote continuam com as regras existentes. Não foram removidos nem implementados novamente neste estudo. A aplicação permanece intacta. Assets e fonte são os mesmos do estudo anterior.

Abra index.html ou sirva esta pasta com `python -m http.server 5191 --bind 0.0.0.0 --directory docs/design-review-v3` a partir da raiz do projeto.

## Validação

### Ajuste do palco após feedback

O palco agora é somente apresentação: removidos cabeçalho de marca/sala/slogan, botões de ampliar palco/GIF, minimizar GIF, indicador de conexão e ajustes de som/reações. Música e cantor ficam em uma faixa compacta acima do vídeo, que aproveita o espaço liberado. QR, GIF com remetente e fila permanecem. O resultado também não mostra controles.

A galeria inclui uma oitava tela, **Controle do anfitrião**, representando onde ficam os ajustes retirados da TV. Os controles continuam sendo simulações locais, sem vínculo com a aplicação. A separação entre apresentação e controle é uma decisão deste protótipo, ainda não implementada no produto.

### Fila na lateral direita

Após novo feedback, a fila saiu do rodapé e passou para a coluna direita, entre o QR e os GIFs. O player ocupa toda a altura disponível abaixo da faixa compacta da música. QR e GIF mantêm os tamanhos anteriores. Palco e resultado foram recapturados em 1280×720; QR, fila e GIF ficam integralmente visíveis e não há controles na apresentação. A alteração continua restrita à prévia.

Sete estados renderizados com fontes/imagens carregadas, sem erros JavaScript ou transbordamento horizontal em celular 390×844 e palco 1280×720 (`render-checks.json`). Expansão/minimização de GIFs, navegação e seleção de nota verificadas em 360 e 390px (`interaction-checks.json`). A aplicação foi comparada com os hashes dos 28 arquivos existentes e permaneceu intacta (`source-integrity.json`). Não houve publicação.
