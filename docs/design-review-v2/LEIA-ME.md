# Novas propostas visuais — exemplos para aprovação

Abra [a galeria](index.html). As propostas anteriores foram rejeitadas por serem semelhantes demais. Nesta rodada, cores, tipografia e composição são livres; nenhuma direção foi aplicada à aplicação.

| Direção | Identidade | Organização do palco |
| --- | --- | --- |
| A — Noite de show | Carvão, lima e Barlow Condensed; contraste e letras de show | Vídeo amplo à esquerda, QR/GIF à direita, fila horizontal inferior |
| B — Clube do refrão | Azul, coral, amarelo e Archivo Black; linguagem festiva | QR à esquerda, vídeo central, fila e GIF à direita |
| C — Roda de vozes | Claro, verde e Bricolage Grotesque; leitura leve | Fila/GIF à esquerda, vídeo à direita, QR no rodapé |

## Escopo e simulações

São protótipos estáticos em HTML/CSS/JS. Há sete estados por direção: jogador, busca, votação, palco, resultado, minhas músicas e pessoas. A navegação, seleção de nota e expansão da busca de GIFs funcionam localmente. Outros botões informam que são prévias.

Player, GIF, contagem de votação, conexão, fila e notas são ilustrativos. O QR aponta para `example.com/mique-preview`, sem vínculo com uma sala. Não há chamadas ao YouTube, GIPHY, backend ou banco. A marca GIPHY indica o provedor já utilizado pelo produto, não uma integração ativa nestes exemplos. O mascote é o asset existente do projeto.

As regras de fila justa, reprodução automática, limite de votação, média, bônus por 10, reconexão, administração e pareamento continuam sendo as existentes. As prévias representam estados visuais; não substituem esses fluxos nem implementam novamente a lógica. A administração completa e os estados de falha ainda devem ser detalhados na direção escolhida. No celular aparecem apenas os pedidos do próprio jogador; a fila global fica no palco. Emojis e GIFs permanecem separados; o QR continua visível nos resultados do palco.

## Decisões e referência

Contexto confirmado: festa entre amigos/família, TV como palco e celulares como controles. O estudo usa a skill Impeccable 4.8.1, instalada isoladamente em `.data/design-review/vendor/impeccable`, sem hooks ou instalação global. Referências de exploração estão em [REFERENCIAS.md](REFERENCIAS.md). O seed `seed:6658c9e9eba0f7b9` atribuiu o repertório coletivo claro/verde (C). A é a alternativa de show; B aproveita a linguagem musical de mixtapes, sem transformar controles em objetos decorativos. C foi mantida como contraponto claro. Nenhuma é identidade aprovada.

O detector registrou dois avisos sobre Inter. A fonte foi mantida apenas no texto utilitário; os títulos e a identidade de cada proposta usam famílias diferentes. Fontes de destaque vêm do Google Fonts, com licenças OFL na pasta assets/fonts. A fonte Inter é a dependência existente do projeto.

## Validação

21 capturas: celular 390×844 e TV 1280×720, com fontes e imagens carregadas. Verificações em [render-checks.json](render-checks.json); hashes dos 28 arquivos existentes da aplicação em [source-integrity.json](source-integrity.json). Revisão visual independente registrada em REVIEW.md. Não foi necessário executar testes de backend, pois nenhum código da aplicação mudou.

Para servir as prévias localmente, na raiz do projeto:

```powershell
python -m http.server 5190 --bind 0.0.0.0 --directory docs/design-review-v2
```

Abra http://localhost:5190. Em outro dispositivo da mesma rede, substitua localhost pelo IPv4 do computador. A porta 5190 é apenas a galeria; a aplicação permanece na porta 5176. Nada foi publicado.
