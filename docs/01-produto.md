# 01 — Produto e requisitos

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

## Visão

Transformar uma reunião de amigos em uma sessão de karaokê organizada e participativa: escolher músicas pelo celular, acompanhar a vez de cada pessoa, reagir às apresentações e votar sem interromper a festa.

O diferencial está na dinâmica do grupo: entrada rápida, distribuição de oportunidades, resultado coletivo e interação durante a música. A pontuação é uma avaliação social da apresentação, sem análise automática de afinação.

## Público e contexto inicial

- Grupos presenciais de amigos e familiares com internet, celulares e uma tela com som.
- Anfitrião que organiza a sessão e precisa resolver erros sem conhecimento técnico.
- Participantes que alternam entre cantar e assistir.

Premissa inicial: até **30 participantes por sala**. É um alvo de projeto a validar, não uma capacidade medida. Uma pessoa pode participar por navegador; identidade anônima não impede alguém determinado de usar vários dispositivos.

## Papéis

| Papel | Responsabilidades e permissões |
| --- | --- |
| Anfitrião | Criar, configurar e encerrar sala; moderar; transferir comando; iniciar e interromper apresentações |
| Participante | Buscar e adicionar músicas para si; remover suas músicas pendentes; votar em outras pessoas; reagir |
| Cantor atual | Participante ligado à apresentação em andamento; não vota em si na proposta inicial |
| Dispositivo de palco | Reproduzir mídia e apresentar estado público; não ganha administração por conhecer o código da sala |

O anfitrião também pode cantar e votar como participante, sujeito às mesmas regras. A tela de palco pode ser uma aba do computador do anfitrião ou outro dispositivo pareado com autorização temporária.

## Escopo da primeira versão utilizável

Inclui criação e entrada em sala por QR/link/código, apelido e avatar simples, busca de músicas, adição à fila, reprodução no palco, fila justa, votação, resultado, bônus de nota 10, emojis, busca de GIFs, moderação básica, reconexão e histórico da sessão.

Fora do escopo inicial: microfone pelo navegador, gravação de voz, remoção de vocais, transposição de tom, avaliação de afinação, streaming de áudio entre casas, aplicativos nativos, assinatura, chat textual e uploads de GIFs. Essas funções não são necessárias ao pedido e aumentam dependências e complexidade.

## Requisitos funcionais

| ID | Requisito | Origem | Verificação principal |
| --- | --- | --- | --- |
| RF-01 | Criar sala com um anfitrião | Pedido | Sala e vínculo do anfitrião persistidos juntos |
| RF-02 | Gerar QR code da sala, sempre visível no palco, com alternativa por código/link | Pedido confirmado + acessibilidade | Cada jogador entra pelo próprio celular; QR permanece visível em todos os estados da sessão |
| RF-03 | Acrescentar `karaoke` à consulta sem alterar o campo do usuário | Pedido | `right through me` gera consulta correspondente |
| RF-04 | Adicionar uma música vinculada a quem vai cantar | Pedido | Item aparece em todos os clientes da sala |
| RF-05 | Ordenar por entrada, com prioridade para quem cantou menos | Pedido | Exemplos de fila do documento 02 passam |
| RF-06 | Tocar uma única apresentação por sala | Derivado | Duas tentativas simultâneas não iniciam dois vídeos |
| RF-07 | Receber votos de 0 a 10 por até 10 segundos | Pedido | Voto fora do prazo é recusado no servidor |
| RF-08 | Exibir média ao encerrar a votação | Pedido | Soma, quantidade e média auditáveis |
| RF-09 | Permitir promoção por nota 10 se houver música aguardando | Pedido | Bônus aplicado uma única vez |
| RF-10 | Enviar emojis e pesquisar/enviar GIFs durante a música | Pedido | Reação chega ao palco da sala correta |
| RF-11 | Recuperar participante e estado após queda de conexão | Derivado | Reconectar não duplica identidade, voto ou música |
| RF-12 | Moderar participantes, reações e músicas | Proposta | Apenas anfitrião executa ações administrativas |
| RF-13 | Transferir anfitrião sem perder a sala | Proposta | Antigo anfitrião perde permissão imediatamente |
| RF-14 | Exibir histórico e resumo da sessão | Proposta | Apenas apresentações concluídas geram resultados |

## Requisitos de experiência e operação

RNF-01: interface em português do Brasil, responsiva e utilizável com uma mão no celular.

RNF-02: ações importantes confirmadas pelo servidor; nenhuma confirmação falsa durante desconexão.

RNF-03: regras da fila e do bônus compreensíveis pela interface; posição futura pode mudar e deve ser identificada como previsão.

RNF-04: metas de tempo e carga definidas no documento 07, sujeitas a medição.

RNF-05: telas públicas não expõem tokens, votos individuais ou controles de anfitrião.

RNF-06: provedor indisponível não apaga fila, pontuação nem histórico.

## Indicadores para avaliar o produto

| Indicador | Definição | Objetivo inicial proposto |
| --- | --- | --- |
| Entrada bem-sucedida | Entradas concluídas / tentativas válidas | ≥ 95% em teste piloto |
| Tempo de entrada | Abrir convite até entrar, excluindo digitação longa | Mediana ≤ 30 s |
| Ativação | Salas com primeira apresentação iniciada / salas criadas | Medir no piloto antes de fixar meta |
| Participação na votação | Votos / elegíveis, por apresentação | Medir sem tratar abstenção como erro |
| Distribuição de turnos | Apresentações por pessoa e maior espera em turnos | Investigar concentração e abandono |
| Recuperação | Reconexões que recuperam estado sem ação manual | ≥ 95% no cenário de teste definido |

Não coletar termos de busca, apelidos ou GIFs individualmente para medir esses indicadores. Usar identificadores técnicos e agregados com retenção curta.

## Critério global de sucesso

Em um piloto com pelo menos seis pessoas, todas conseguem entrar, adicionar música, entender a fila, concluir uma apresentação, votar e ver o resultado. Uma queda breve de Wi-Fi e um vídeo indisponível devem ser recuperáveis pelo anfitrião sem recriar a sala.
