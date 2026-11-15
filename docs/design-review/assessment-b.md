# Avaliação B — detector e evidência renderizada

Avaliação independente da Avaliação A; seu conteúdo não foi lido. Escopo: `apps/web/src`, página inicial ao vivo e cinco capturas já existentes. Trabalho somente de análise: nenhum arquivo da aplicação, configuração, hook ou dependência alterado.

## Detector de fonte

Executado uma única vez em 2026-11-08 com `IMPECCABLE_HOME=D:\Dev\Personal\karaoke\.data\design-review\engine` e `DO_NOT_TRACK=1`:

```powershell
& '.data/design-review/vendor/impeccable/scripts/impeccable.cmd' detect --json apps/web/src
```

Saída completa: `docs/design-review/detector-source.json`. Código de saída **2**, que significa achados, não falha de execução. **5 warnings, 1 regra distinta (`overused-font`), categoria `slop`, 2 arquivos**. Todos indicam declarações `font-family: Inter`, importadas por `main.tsx`:

| Arquivo | Linha | Seletor e papel |
|---|---:|---|
| `apps/web/src/stage.css` | 12 | `.brand-name small`, assinatura da marca |
| `apps/web/src/style.css` | 4 | `:root`, família padrão |
| `apps/web/src/style.css` | 678 | `.how-it-works h3`, títulos dos passos |
| `apps/web/src/style.css` | 1147 | `.song h3`, título da música |
| `apps/web/src/style.css` | 1351 | `.countdown small`, legenda do cronômetro |

Não interpretar esses cinco registros como cinco problemas independentes. São repetições de uma decisão tipográfica. A regra é estilística; não acusa uma falha funcional ou de acessibilidade. Nenhuma outra regra foi emitida neste scan. Isso não constitui certificação de contraste, toque, teclado, estados dinâmicos ou ausência de bugs.

## Evidência do navegador

Criada uma aba própria, em segundo plano, para `http://karaoke.192.168.0.122.sslip.io:5176/`. A página carregou com título `Karaoke Míque · Solta a voz, pede Bis`. Foram lidos árvore de acessibilidade e screenshot da viewport inicial. A aba foi fechada após a inspeção; nenhuma sala foi aberta, criada ou modificada.

A renderização inicial mostra título dominante, CTA rosa “Criar uma sala”, alternativas “Tenho um código” e “Usar como palco”, mascote de microfone e prévia de fila/reação. A árvore apresenta navegação com nome, hierarquia h1/h2/h3, alternativas de entrada por código e descrição de imagem do mascote. Isso confirma presença desses elementos nessa rota; não prova suporte completo a leitores de tela ou teclado em todas as rotas.

**Sem overlay e sem resultados de console do detector no navegador.** Preflight de mutação, injeção de script, live mode e live-server foram deliberadamente omitidos por instrução de revisão sem injeção/alterações. Não foi uma falha da ferramenta. O sinal alternativo é screenshot + árvore de acessibilidade da página inicial, acrescidos das capturas locais das demais superfícies. Nenhum servidor auxiliar foi iniciado; nenhuma limpeza de live-server é necessária.

## Evidência das capturas existentes

Estas imagens são evidência renderizada de estados registrados anteriormente, não confirmação de que esses estados foram reproduzidos ao vivo nesta avaliação. Exibem banner de demonstração: busca/player simulados; votos, fila, salas e persistência reais. Por isso não interagi com essas salas.

| Captura | O que está visível | Limite da conclusão |
|---|---|---|
| `docs/screenshots/mobile.png` | Resultado “10,0”, anfitrião, controle automático da fila, reações e navegação inferior com rótulos | A barra fixa cruza o conteúdo numa captura longa; isso sozinho não comprova que o conteúdo fica inacessível na viewport real |
| `docs/screenshots/search.png` | Busca rotulada “Música ou artista”, ação “Adicionar” por resultado, toast “Música adicionada! Acompanhe sua vez na fila.” | Confirma instrução e feedback nessa imagem; catálogo é simulado, não se infere qualidade da busca real |
| `docs/screenshots/vote.png` | Notas 0–10 com números explícitos, cronômetro de 11 segundos, “0 de 2 votos recebidos”, confirmar visualmente desabilitado | A imagem mostra estado sem nota escolhida; não prova comportamento da confirmação ou extensão de tempo |
| `docs/screenshots/stage-gif-sidebar.png` | Palco grande à esquerda, QR/código/fila/GIF à direita, controles pequenos na lateral | Legibilidade à distância merece verificação em TV, mas não foi medida em ambiente real |
| `docs/screenshots/stage-1080p.png` | Resultado domina o palco; QR e próximas vozes permanecem visíveis à direita | A hierarquia do resultado é clara nesta resolução; não valida todos os tamanhos de TV |

## Falsos positivos e interpretação contextual

1. **Inter não equivale a identidade genérica.** A família é uma escolha comum, mas a linguagem “solta a voz, pede Bis”, o mascote, a divisão celular/palco, os rituais de votação e a fila dão especificidade ao produto. O scan vê tokens CSS e não pondera essa composição. Os títulos usam a variável `--heading: "Nunito Sans", Inter, sans-serif`; portanto a leitura “a interface inteira usa Inter” também excederia a evidência. Não foi inspecionada a fonte efetivamente resolvida pelo navegador. O warning pode ser documentado como observação P3; não sustenta troca de fonte sem necessidade demonstrada.
2. **Paleta fixa deve permanecer fixa.** O scan não reportou problema cromático. Roxo, rosa e ciano nas capturas são coerentes com marca e festa; não há fundamento para recolorir a interface com base em uma regra de “slop”. O limite não impede medir contraste futuramente, mas esta avaliação não apresenta medição de contraste renderizado.
3. **UI de festa admite exuberância útil.** Mascote, nota grande, emojis e GIF fazem parte da participação coletiva. Suprimi-los por parecerem ornamentais seria um falso positivo de contexto. Na captura com GIF o conteúdo fica numa lateral distinta do palco; no código há rótulos para reações e referência a `prefers-reduced-motion` (`main.tsx:469`). Isso não certifica que toda animação obedeça à preferência, mas impede afirmar simplesmente que a preferência não existe.
4. **Opções numéricas não são navegação arbitrária.** A escala 0–10 tem onze alvos, mas é uma escala familiar e ordenada. Um critério mecânico de “mais de quatro opções” não basta para remover opções ou redesenhar a votação. Os números também evitam depender exclusivamente da cor.

## O que merece validação posterior, sem alteração agora

- Confirmar no dispositivo se textos auxiliares do palco permanecem legíveis à distância: há declarações pequenas, como `.brand-name small` em `stage.css:13` (`0.52rem`) e legendas/controles na lateral. Os números são evidência de fonte; o impacto depende de escala e distância, portanto é hipótese de verificação, não falha comprovada.
- Verificar alcance por teclado e anúncio de estados de votação/toast numa sala explicitamente de teste, sem tocar em salas existentes. A presença de `aria-label` é evidência parcial, não uma auditoria concluída.
- Inspecionar viewport móvel real com barra inferior e conteúdo longo antes de declarar sobreposição impeditiva. Capturas de página inteira não resolvem sozinhas comportamento de elementos fixos.

## Proveniência e execução

- Avaliação A: não lida; nenhum achado foi compartilhado com o agente de síntese durante a execução.
- Ignore list: `.impeccable/critique/ignore.md` ausente.
- Detector: executado uma vez, JSON completo preservado, 5 warnings da mesma regra e locais completos disponíveis.
- Browser: aba nova própria, oculta, página inicial carregada e inspecionada, aba fechada.
- Injeção/live/overlay: omitidos por restrição expressa; não alegar overlay visível.
- Alterações: apenas artefatos de análise em `docs/design-review`; aplicação/configuração intactas.
- Temporários: nenhum arquivo temporário adicional ou servidor de visualização criado nesta avaliação.
