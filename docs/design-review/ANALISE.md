# Estudo de acabamento — Karaoke Míque

**Somente exemplos para validação. Nada foi aplicado à aplicação.** Prioridade escolhida pelo usuário: jogador e palco. Escopo fixo: preservar funcionalidades, conteúdo, ordem, posição dos blocos e cores.

## Leitura principal

A identidade já é de karaokê: o palco, o QR, as próximas vozes, os emojis e o mascote têm função e personalidade. A impressão de template aparece no acabamento repetido: muitos títulos em Nunito Sans 900, cantos arredondados parecidos para quase todos os papéis, vários contornos equivalentes e sombras rígidas nos botões.

Não proponho trocar a paleta ou redistribuir a tela. Proponho dar menos peso aos controles de utilidade e reservar a exuberância à música, à nota e ao mascote.

## Prioridades

1. **P2 · Hierarquia tipográfica:** diferenciar título do momento, título de seção e metadado. A força atual de `h1/h2/h3` é muito semelhante. Ajustar peso, família dentro do par já utilizado e tracking — sem mudar caixas, ordem ou cores.
2. **P3 · Acabamento dos controles:** os votos, emojis, CTA e botões de utilidade misturam profundidade dura, plana e contornos. Dar uma regra clara a cada direção, preservando todos os alvos e suas dimensões.
3. **P3 · Superfícies:** coordenar cantos e estilo de borda sem remover/fundir cards. A grade, o palco dominante e a lateral permanecem iguais.

Há um ponto de legibilidade para uma etapa posterior: os textos auxiliares da TV são pequenos. Nesta proposta não aumentei tamanhos nem reposicionei controles, conforme a restrição recebida. Esse ponto exige ensaio na distância real da TV, não uma conclusão tirada apenas da captura.

## Duas direções

| | A · Catálogo musical | B · Festa refinada |
| --- | --- | --- |
| Voz visual | Mais direta, próxima de um aplicativo de música | Mais acolhedora, próxima da identidade atual |
| Tipografia | Inter nos títulos operacionais; marca, mascote e nota preservados | Nunito Sans nos títulos, com peso 800 e tracking menos apertado |
| Cantos | Cards de 12px, botões mais precisos | Cards de 16px, botões de 8–12px conforme o papel |
| Profundidade | Votos e emojis planos | Profundidade curta e suave em votos/emojis, sem bloco de sombra rígida |
| O que não muda | Paleta, textos, controles, caixas e posições | Paleta, textos, controles, caixas e posições |

**Recomendação: A.** Ela separa melhor a parte operacional do momento de festa. A personalidade continua no nome, nas cores, nas reações, na nota e no mascote. B é uma alternativa mais próxima do visual atual.

## Como foram produzidos os exemplos

Foram capturadas cinco telas reais da implementação atual em uma instância e banco isolados, com **dados fictícios**: jogador, busca, votação, palco e resultado. Não foram abertas nem alteradas salas de usuários. O conteúdo foi congelado no mesmo instante antes de gerar Atual/A/B, evitando diferenças de relógio, voto ou estado entre os exemplos.

Os títulos mantêm as quebras de linha originais; caixas e botões têm as dimensões congeladas nas capturas. Pequenos ajustes ópticos de tamanho da fonte preservam a largura do texto quando a família/peso muda. Portanto os CSS de estudo são documentação de direção, **não arquivos prontos para copiar para produção**. Se uma direção for aprovada, será necessário integrar e validar os estados/responsividade na etapa seguinte.

As quinze imagens foram comparadas por geometria dos elementos principais e cores computadas (texto, fundo e borda): **deslocamento máximo de 0px e zero mudanças de cor** nas amostras medidas. Evidência em [render-checks.json](render-checks.json). Isso não equivale a uma auditoria completa de acessibilidade ou à validação funcional de um novo tema.

Os QR das imagens pertencem ao ambiente fictício e não devem ser usados para entrar em uma sala. Os botões representados são imagens, não ações reais. A [galeria](index.html) permite apenas alternar e ampliar essas capturas.

## Uso do Impeccable

Foi utilizada uma cópia isolada da skill oficial [Impeccable](https://github.com/pbakaus/impeccable), versão de skill 4.8.1 e engine 0.1.19, sem hooks, sem instalação global, sem live mode e sem mecanismo que aplique mudanças à aplicação.

- **Avaliação A independente:** revisão visual e de fonte, [relatório](assessment-a.md). Avaliação heurística provisória: 28/40, sem P0/P1 comprovados; não é resultado do detector nem certificação de usabilidade.
- **Avaliação B independente:** detector de fonte e observação do navegador, [relatório](assessment-b.md). Só foi lida pela síntese depois de A terminar. Detector: cinco avisos da mesma regra, todos sobre Inter; [JSON](detector-source.json).
- **Interpretação:** a popularidade da fonte não é, sozinha, um defeito. Como a família já pertence à identidade e serve bem ao uso no celular, o exemplo A altera sua distribuição de papéis, em vez de introduzir outra fonte só para escapar do aviso.
- **Detector da galeria:** um aviso sobre Inter na interface de comparação, [JSON](detector-preview.json). A galeria não é a aplicação; as propostas são capturas raster e esse scan não mede a qualidade das imagens.
- **Limite deliberado:** não houve injeção de overlay no aplicativo nem uso do modo de aplicação automática. A análise usa fonte, capturas e comparação separada. Não se afirma que um overlay esteja instalado no navegador.

## Entregáveis

- [Galeria Atual / A / B](index.html), utilizável como arquivo local, sem backend.
- [Comparação da tela do jogador](comparacao-jogador.png).
- [Comparação do palco](comparacao-palco.png).
- [Direção A](direction-a.css) e [direção B](direction-b.css), somente estudos isolados.
- Imagens em `images/`, com versão atual e duas propostas para cada tela.

Nenhuma proposta está aprovada nem conectada ao bundle da aplicação. As decisões de implementação ficam para depois da validação do usuário.

## Integridade e encerramento

Foram conferidos hashes SHA-256 de 28 arquivos existentes em `apps/`: zero arquivos alterados ([registro](source-integrity.json)). Não foram criados arquivos novos em `apps/`, nem alterados configuração, dependências ou hooks do projeto. O servidor e o banco isolados das capturas foram encerrados/removidos, assim como suas credenciais efêmeras. O servidor normal de revisão na porta 5176 permaneceu ativo. A galeria é estática e abre localmente, sem depender do ambiente de captura.

As propostas foram verificadas visualmente em 390×844 e 1280×720, junto com a igualdade de geometria/cores e navegação/filtro da galeria. Não se executaram testes funcionais da aplicação nesta rodada porque nenhum código funcional ou visual do aplicativo foi modificado.
