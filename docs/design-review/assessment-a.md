# Avaliação A — Karaoke Míque

Revisão independente de design, sem detector. Modo **Operate**: entrar, escolher música, acompanhar a sala, votar e conduzir a festa. Escopo de proposta: acabamento visual; funcionalidades, posições, dimensões dos blocos, ordem, paleta e conteúdos atuais preservados. Nenhum arquivo da aplicação foi editado.

## Evidência e limites

Foram lidos `apps/web/src/style.css`, `stage.css`, `score-result.css` e trechos relevantes de `main.tsx`, além de `docs/14-direcao-visual.md` e `docs/16-fila-automatica-e-tv.md`. Foram abertas visualmente as seis capturas: `mobile.png`, `search.png`, `vote.png`, `stage-gif-sidebar.png`, `stage-1080p.png`, `tv-connect.png`. As capturas de busca/votação e as de fila/TV pertencem a revisões diferentes; diferenças de rótulos não são automaticamente inconsistências atuais. A captura do player é de demonstração, portanto não permite julgar imagem/legenda do vídeo real. Esta avaliação não executou fluxo ao vivo, teste com leitor de tela ou medição física de TV; notas de comportamento apoiam-se no código e documentos, com essa limitação.

## Especificidade: produto reconhecível, acabamento ainda generalizado

O sistema já é autoral no que importa: o celular participa e a TV apresenta; convite, próximas vozes, aplausos e resultado compartilham um contexto real de karaokê. O número gigante com o microfone celebrando é o momento mais próprio do Míque. Não há razão para substituir a estrutura por uma nova composição.

A impressão de template aparece na camada intermediária: muitas superfícies arredondadas com contorno semelhante, títulos pequenos e grandes igualmente pesados e vários rótulos em caixa alta com tracking. Essa gramática poderia migrar para um painel de jogos sem adaptação. A oportunidade é fazer o acabamento parecer deliberado: reservar a energia para cantar, votar e celebrar; dar leitura editorial aos metadados e controles. Isso pode ser mostrado em exemplos isolados sem alterar o aplicativo.

## Forças

1. **Separação de papéis legível.** Palco dominante, QR isolado e fila lateral dão à TV um propósito claro. O celular mantém ações rotuladas e navegação com quatro destinos.
2. **Resultado com memória emocional.** A escala do 10,0, a frase e o mascote constroem um pico coerente com uma festa. A nota não vira uma tabela administrativa.
3. **Feedback e salvaguardas concretos.** Há conexão explícita, confirmação de voto, confirmação de ações como pular/cancelar, bloqueio de envio desconectado e alternativa de pareamento pelo código. `focus-visible`, números nos votos e `aria-pressed` já evitam depender só da cor.

## Prioridades de acabamento

### [P2] Peso tipográfico secundário disputa com a ação principal

**Evidência:** `h1, h2, h3` em `style.css` recebem Nunito Sans 900 e tracking -0.035em; `.room-title h1` chega a -0.04em. Em `vote.png`, o título da tela, a pergunta de votação e os títulos dos cards inferiores têm densidade visual semelhante; em `mobile.png`, “Mande energia para o palco” tem peso próximo ao anúncio do resultado. Em `search.png`, o título de estado e o título da busca estabelecem dois anúncios fortes antes do campo.

**Impacto:** leitura um pouco mais lenta e sensação de kit pronto, especialmente ao alternar entre cabeçalhos e microinformações. O problema é a distribuição de ênfase, não a escolha das duas famílias.

**Exemplo a validar:** manter Nunito Sans/Inter, tamanhos, linhas e caixas; comparar títulos auxiliares em 800 com os atuais em 900, preservando 900 na marca, no momento principal e nos números. Manter a mesma quebra de linha nos exemplos; qualquer variante que desloque conteúdo reprova a restrição. Não mudar a hierarquia do DOM nem a redação. Comando pertinente para uma eventual etapa autorizada: `$impeccable typeset`.

### [P2] Microtipografia do palco perde definição a distância

**Evidência:** `stage.css`: `.stage-tools button` usa 0.57rem (0.65rem acima de 1500px), `.stage-tools .check` 0.59rem e `.stage-signature span` 0.48rem. `.stage-sidebar .queue small` fica em 0.64rem na configuração base. Em `stage-gif-sidebar.png`, as instruções e controles inferiores ficam muito discretos perto do QR e do player; em `stage-1080p.png`, o contraste de escala entre resultado e rodapé é especialmente grande.

**Impacto:** o anfitrião que olha para a TV pode distinguir que há controles sem ler confortavelmente seus rótulos. É risco de legibilidade, não bloqueio comprovado; falta ensaio no aparelho e distância reais.

**Exemplo a validar dentro do limite:** preservar tamanhos e caixas; comparar peso de texto, regularidade das formas e alinhamento óptico dos rótulos existentes. Não aumentar fontes nem redistribuir a lateral nesta rodada. Se o ensaio a distância continuar falhando, registrar a limitação e deixar qualquer mudança dimensional para escopo futuro explícito. Comando pertinente: `$impeccable typeset`.

### [P3] As bordas tratam seções diferentes como o mesmo tipo de objeto

**Evidência:** `.card` (16px), `.song` (13px), `.stage-sidebar .queue` (11px), `.gif-spotlight` (10px) e `.host-controls` pontilhado repetem contorno e canto como recurso principal de diferenciação. Em `mobile.png`, resultado, música atual, controles, reações e GIFs formam uma sequência de caixas; em `stage-gif-sidebar.png`, convite/fila/GIFs/controles acumulam tratamentos de painel.

**Impacto:** o produto parece montado com componentes independentes, embora as relações funcionais estejam corretas. Severidade de acabamento, sem defeito de uso demonstrado.

**Exemplo a validar:** comparar perfis de canto e profundidade com o mesmo bounding box e as cores atuais. Conservar todos os cards e bordas de separação; reduzir a variedade de tratamentos secundários e reservar a sensação de botão físico para ações. Não retirar informação, fundir seções ou alterar padding. Comando pertinente: `$impeccable polish`.

### [P3] Marca, ícones e mascote têm níveis diferentes de acabamento

**Evidência:** `.brand-mark` e ícones vetoriais são planos; `.avatar-large` e `.emoji-row` usam emojis nativos; `.result-mascot` é um microfone volumétrico com brilho. O contraste fica explícito entre o avatar 🎤 do cabeçalho, a arte de música e o mascote do resultado em `mobile.png`.

**Impacto:** a celebração é memorável, mas os acessórios podem parecer uma coleção de bibliotecas. Emojis são conteúdo de participação, e não devem ser removidos ou redesenhados nesta revisão.

**Exemplo a validar:** harmonizar apenas os recipientes atuais: cantos, sombra e acabamento de pressão dos botões/avatares, com o mesmo espaço, ativos e cores. Preservar a arte do mascote e os emojis enviados. Não gerar nova marca ou trocar a família de ícones. Comando pertinente: `$impeccable polish`.

Nenhum P0 ou P1 de design foi comprovado por esta evidência. Sobreposição de navegação em capturas de página longa não basta para afirmar bloqueio real: a barra é fixa e o conteúdo tem reserva inferior em `.mobile-content`.

## Tipografia

Nunito Sans com Inter combina hospitalidade e leitura operacional. A fonte arredondada ajuda a festa sem exigir uma família nova. O ajuste principal é restringir o peso máximo: título de momento e nota podem continuar fortes; cabeçalhos de utilidade precisam de menos densidade. O tracking negativo global deve ser avaliado por tamanho, sem comprimir palavras pequenas por hábito. `tabular-nums` já existe no resultado, contador e posições: preservar. O código da TV deve continuar um bloco único, no mesmo lugar e com os mesmos dígitos; não sugerir agrupamento ou mudança de conteúdo nesta etapa.

Não é necessário inventar outra escala tipográfica, ampliar títulos, mudar fontes ou mexer nos espaçamentos para validar acabamento. Os exemplos devem usar as fontes locais carregadas e comparar o resultado nos tamanhos originais.

## Heurísticas de Nielsen — 28/40, bom com ressalvas

Escala 0–4 do guia. Todas se aplicam a **Operate**; nenhum `n/a` foi usado. As notas são uma leitura de design e código, não certificação de acessibilidade nem teste de sucesso dos fluxos.

| # | Heurística | Nota | Evidência e ressalva |
|---|---|---:|---|
| 1 | Visibilidade do estado | 3 | Conectado, contagem, votos recebidos e confirmação explícitos; estados assíncronos completos não exercitados. |
| 2 | Correspondência com o mundo real | 4 | Música, palco, anfitrião, aplausos e bis formam vocabulário coerente e instruções naturais. |
| 3 | Controle e liberdade | 3 | Remoção de pedido, controle manual, minimizar GIF e fechamento por Escape documentados; não há desfazer universal. |
| 4 | Consistência e padrões | 3 | Navegação rotulada, famílias e botões coerentes; densidade e acabamento variam entre painel, palco e resultado. |
| 5 | Prevenção de erros | 3 | Sem nota pré-selecionada, confirmação antes de pular/cancelar e envios bloqueados offline; teste de erros não executado aqui. |
| 6 | Reconhecimento em vez de memória | 3 | Campo rotulado, números visíveis e convite com alternativa; controle pequeno no palco dificulta reconhecimento à distância. |
| 7 | Flexibilidade e eficiência | 2 | Automático e caminhos alternativos de conexão ajudam; não foi demonstrado repertório amplo de aceleradores. Não implica criar funcionalidades. |
| 8 | Estética e minimalismo | 2 | Tarefa central clara, mas pesos altos e painéis equivalentes elevam ruído periférico. |
| 9 | Reconhecer/diagnosticar/recuperar erros | 2 | Falha técnica tem orientação; `connect_error` informa sessão possivelmente removida/substituída sem próximo passo direto. Não recomenda alterar texto neste escopo. |
| 10 | Ajuda e documentação | 3 | QR/código, instruções de busca, votação e GIFs oferecem ajuda contextual; cobertura dos casos extremos não foi exercitada. |

## Carga cognitiva

- **Opções >4:** votação tem onze notas, reações têm seis emojis; GIFs podem mostrar vários resultados. São escolhas do domínio já autorizadas, não justificativa para apagar opções. Os votos possuem ordem numérica e agrupamento visual existentes: preservar integralmente.
- **Navegação:** quatro destinos, dentro do limite de memória de trabalho. Rótulos explícitos e aba ativa reduzem esforço.
- **Ruído visual: falha parcial.** Muitos pesos fortes e contornos simultâneos. Resolver via acabamento e hierarquia tonal já existente, sem nova cor e sem esconder nada.
- **Demanda simultânea: risco localizado.** No voto, a pessoa lê a pergunta, acompanha tempo e escolhe entre onze valores enquanto ainda pode reagir. É a dinâmica atual da festa; manter e evitar acrescentar animações concorrentes ou ornamentos.
- **Ponte de memória: mitigada.** A música atual e o nome continuam próximos de voto/resultado; conexão oferece QR e código visíveis.
- **Navegação escondida/jargão/inconsistência/contexto alternado:** nenhuma falha forte comprovada no material observado. Não transformar ausência de teste em aprovação universal.

## Jornada emocional

A conexão tem boa segurança emocional: diz quem deve agir, oferece QR/código e informa a espera. A busca prepara o desejo de cantar; o palco concentra atenção no vídeo; a votação aumenta tensão; resultado e mascote entregam o pico. O vale mais provável é a espera ou falha de conexão, hoje com tratamento mais administrativo. A atuação nesta rodada deve ser cosmética: clareza do texto já existente e consistência da superfície, sem adicionar onboarding, mudar mensagens ou alterar tempos. Preservar a celebração; não espalhar brilhos e movimento por todos os estados. O suporte existente a movimento reduzido deve permanecer.

## Personas: sinais de atenção

- **Jordan, primeira participação:** encontra ação natural na busca e QR com instrução; títulos de estado e título da tarefa em peso equivalente competem pelo primeiro olhar (`.room-title h1`, `.search-panel h2`). Não há evidência de que precise de tutorial novo.
- **Casey, celular e atenção dividida:** onze votos mais seis reações elevam escolhas; a seleção explícita e confirmar ajudam a evitar toque acidental. O efeito físico dos botões deve continuar reconhecível sem tornar todas as superfícies igualmente chamativas. Não mover botões ou reduzir opções.
- **Sam, baixa visão/teclado:** há `focus-visible`, rótulos e estados explícitos no código; a microtipografia da TV é o alerta concreto. Nenhuma afirmação de conformidade de contraste ou leitor de tela foi feita sem medição/teste.

## Duas direções de acabamento para exemplos separados

### A — Catálogo com acabamento editorial

Mais próximo da clareza de um catálogo musical: mesma Nunito/Inter, mesmos tamanhos e posições; menos peso em cabeçalhos auxiliares, contornos secundários mais consistentes e sombras mais disciplinadas. Marca, notas e voto mantêm o caráter lúdico. Usar **busca + resultado no celular + lateral do palco** como amostras. Boa opção para fazer o app parecer mais maduro sem perder a festa.

### B — Console de festa tátil

Mais próximo do jogo coletivo: mesmas posições/paleta/conteúdos, com acabamento físico consistente nos botões existentes, cantos coordenados entre votos/reação/CTA e um tratamento de superfície coerente ao redor. Manter o mascote como pico visual, sem criar textura, cor, ícone ou ilustração novos. Usar **votação + resultado + pareamento da TV** como amostras. Boa opção para manter energia e dar mais intenção às interações atuais.

Em ambas, entregar somente comparativos separados para validação, sem CSS aplicado. Critério de aceitação: mesmos textos e opções, bounding boxes dos componentes iguais, quebra de linha idêntica, paleta sem acréscimos e nenhuma funcionalidade omitida. Se o peso de fonte mudar a geometria, rejeitar a variante ou limitar o ajuste aos elementos onde a geometria se conserva. Não redesenhar layout para acomodar o acabamento.

## Observações menores e questões para síntese

O mascote no resultado merece permanecer como assinatura principal. O estado desabilitado já se diferencia por opacidade; não inventar uma nova cor de estado. O círculo da contagem e os números têm boa força; não converter em outro componente. As diferenças temporais entre screenshots devem ser identificadas em exemplos, evitando propor a volta de rótulos ou fluxos históricos.

Questões úteis para validação posterior: qual direção parece mais Míque quando o mascote não está visível? O acabamento continua legível numa TV real à distância habitual? Qual amostra torna o participante mais confiante sem chamar atenção adicional durante a música?
