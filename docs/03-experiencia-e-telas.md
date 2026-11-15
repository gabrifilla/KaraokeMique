# 03 — Experiência, telas e direção visual

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

## Princípios de experiência

O celular deve responder “o que posso fazer agora?”; o palco deve responder “quem está cantando e quem vem depois?”. A interface muda com o estado da sessão, preservando navegação e contexto.

Direção visual adotada: base azul noturna, magenta para ações e ciano para realces, com títulos em Nunito Sans e leitura em Inter. Singa orienta a organização do catálogo e Kahoot orienta os momentos de participação, votação e resultado. A [direção visual 03](14-direcao-visual.md) registra a escolha do usuário, a aplicação no produto e a situação da sincronização com Figma. Movimento continua moderado e a tipografia do palco prioriza leitura a distância; o nome segue provisório.

Não desenhar uma interface igual no celular e na TV. O palco favorece vídeo e leitura distante; o celular favorece busca, botões e decisões rápidas.

## Jornadas principais

**Anfitrião:** início → criar sala → lobby com QR → ativar/parear palco → aguardar músicas → iniciar apresentação → acompanhar votação → ver resultado → preparar próxima → encerrar e ver resumo.

**Participante:** QR/link/código → apelido/avatar → sala → buscar música → conferir vídeo → adicionar → acompanhar fila → cantar → receber resultado. Enquanto assiste: reagir e votar.

**Reconexão:** perda de conexão → aviso persistente → controles de envio indisponíveis → autenticar novamente → obter snapshot → atualizar tela para estado atual. Se a votação já acabou, apresentar resultado; não tentar reenviar voto vencido.

## Rotas propostas

| Rota | Tela | Acesso |
| --- | --- | --- |
| `/` | Entrada e apresentação do produto | Público |
| `/rooms/new` | Criação de sala | Público com proteção contra abuso |
| `/join` | Inserir código | Público |
| `/join/:code` | Entrar com apelido/avatar | Convite válido |
| `/r/:roomId` | Sala no celular | Membro autenticado |
| `/r/:roomId/search` | Busca de músicas | Membro ativo |
| `/r/:roomId/queue` | Fila e minhas músicas | Membro |
| `/r/:roomId/people` | Participantes | Membro |
| `/r/:roomId/settings` | Gestão da sala | Anfitrião |
| `/stage/pair` | Pareamento do palco | Código temporário autorizado |
| `/stage/:roomId` | Palco | Sessão de dispositivo pareada |
| `/r/:roomId/summary` | Resumo | Membro até expiração |

Votação, resultados e reações são estados/contextos da sala, sem exigir navegação para outra página. O servidor continua verificando autorização em todas as rotas de dados.

## Especificação por tela

| ID | Tela | Conteúdo e ação principal | Estados obrigatórios |
| --- | --- | --- | --- |
| T01 | Início | “Criar sala” e “Entrar em uma sala”; explicar uso em grupo | Carregando, serviço indisponível |
| T02 | Criar sala | Nome opcional, apelido, avatar, resumo das regras; “Criar” | Validação, enviando, criação concluída, limite temporário |
| T03 | Entrar | Código predefinido pelo QR, nome da sala, apelido e avatar | Sala inválida, cheia, bloqueada, encerrada; sessão já existente |
| T04 | Lobby | Pessoas, QR/link/código, músicas aguardando; anfitrião vê “Preparar primeira” | Fila vazia, palco não conectado, aguardando anfitrião |
| T05 | Buscar | Campo, botão buscar, resultados com título/canal/miniatura/duração; “Adicionar” | Inicial, buscando, vazio, quota, falha, paginação, item já adicionado |
| T06 | Confirmar música | Informações do vídeo, cantor “Você”, aviso de repetição se necessário | Adicionando, confirmação, limite atingido, vídeo recusado |
| T07 | Fila | Apresentação atual separada; próximas previstas; minhas músicas | Vazia, atualizada, item suspenso, bis, remoção pendente |
| T08 | Durante música | Cantor, faixa atual, próximas; botão de emojis e GIFs | Tocando, pausado, reconectando, falha no palco |
| T09 | Seletor de reações | Emojis rápidos; aba GIFs com busca e atribuição | Carregando, vazio, falha do provedor, reação enviada |
| T10 | Votação | Nome do cantor, onze notas de 0 a 10, “Confirmar nota”, tempo restante | Selecionada, enviando, aceita, prazo encerrado, sem direito, cantor |
| T11 | Resultado | Média, quantidade de votos, celebração; oferta de bis quando aplicável | Sem votos, bis aceito/recusado/expirado, aguardando anfitrião |
| T12 | Pessoas/gestão | Lista, presença, transferir anfitrião, remover; abrir/fechar entrada e reações | Confirmação de ação, sem permissão, pessoa saiu |
| T13 | Parear palco | Código temporário e confirmação no anfitrião | Expirado, negado, já pareado, novo dispositivo |
| T14 | Palco | Vídeo, cantor, fila resumida, faixa separada de reações e QR sempre visível e legível | Lobby, preparação, reprodução, pausa, votação, resultado, recuperação |
| T15 | Resumo | Apresentações, resultados e destaques positivos | Sem apresentações, sala expirada, dados removidos |

## Composição do celular

Cabeçalho: nome da sala, conexão e acesso ao convite. Área principal: cartão do estado atual. Navegação inferior: **Sala**, **Buscar**, **Fila**, **Pessoas**.

Durante votação, o cartão de notas tem prioridade visual, mas não bloqueia navegação. Se a pessoa estiver na busca, um aviso persistente permite voltar para votar e mostra contagem regressiva.

As onze notas usam uma grade de botões com rótulo explícito, sem depender de slider. Selecionar destaca a opção; confirmar envia. Não pré-selecionar nota nem enviar por toque acidental. O estado “Voto enviado” só aparece depois do ACK.

Fila: separar “Agora” de “Próximas previstas”. Exibir “Sua posição pode mudar para dar vez a quem cantou menos”. No item com bônus: “Bis por nota 10”. Não estimar minutos com precisão falsa; se houver estimativa futura, sinalizar dependência de pausas e duração dos vídeos.

## Composição do palco

Layout desktop adotado na revisão do usuário: sem header; coluna principal ampla para música/player, com título e cantor compactos. Coluna direita com card QR menor, fila completa rolável abaixo e GIF recebido em destaque. Emojis caem em posições aleatórias sobre a área principal, com quique e fade, sem capturar cliques. A [revisão de palco e identidade](15-palco-e-identidade.md) substitui a antiga proposta de faixa inferior de reações.

Requisito confirmado: cada jogador acessa o site pelo próprio celular escaneando o QR code da sala. Reservar um espaço fixo para o QR, fora do vídeo, visível durante toda a sessão: lobby, preparação, reprodução, pausa, votação, resultados e recuperação. Manter código da sala e instrução “Escaneie para entrar” junto dele. Modais, GIFs, placares e animações não podem cobrir esse espaço. Verificar leitura com câmera de celular na distância real de uso; não reduzir o QR apenas para acomodar outros elementos.

No lobby, dar destaque adicional ao convite. Em votação, mostrar contador e “Vote pelo celular”. Em resultados, destacar média e quantidade de votos, preservando a área fixa do QR. Se o anfitrião bloquear novas entradas, manter o convite visível e informar o bloqueio a quem abrir o link. Após encerrar a sala, o link deve informar o encerramento, sem permitir entrada.

Oferecer “Expandir palco” no contêiner completo da aplicação, preservando vídeo e área do QR em tela cheia. Fullscreen exclusivo do vídeo não atende ao requisito de QR permanente; não usá-lo como modo de palco do aplicativo. Validar na prova técnica o comportamento dos controles nativos do player e dos navegadores, registrando eventuais limitações. Smart TVs com navegador próprio ficam fora da compatibilidade inicial proposta; navegador de computador conectado à TV é a configuração sugerida.

## Componentes para o design system

`RoomCode`, `InviteCard`, `ConnectionBanner`, `ParticipantAvatar`, `PresenceBadge`, `SongCard`, `QueueItem`, `QueuePriorityBadge`, `PlayerFrame`, `ReactionPicker`, `GifSearchGrid`, `VoteGrid`, `VoteCountdown`, `ScoreCard`, `EncoreOffer`, `HostControls`, `EmptyState`, `ErrorState` e `ConfirmDialog`.

Cada componente interativo deve especificar padrão, hover quando aplicável, foco, pressionado, desabilitado e carregamento. Definir tokens semânticos para cor, tipografia, espaçamento, bordas, sombra e duração de movimento; evitar cores locais desconectadas dos tokens.

## Acessibilidade e responsividade propostas

- Mirar WCAG 2.2 nível AA e verificar no protótipo e na implementação. Referência: [guia oficial WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/).
- Alvos de toque de pelo menos 44 × 44 px; contraste de texto normal de pelo menos 4,5:1.
- Operação por teclado, foco visível, rótulos acessíveis, ordem de leitura e saída de modais previsíveis.
- Não distinguir presença, nota, erro ou prioridade apenas por cor.
- Respeitar preferência de movimento reduzido; permitir desativar animações de reação localmente.
- Não anunciar cada segundo do contador em leitores de tela; anunciar abertura e proximidade do fim, sem excesso.
- Exibir código e link como alternativas ao QR.
- Verificar celular com largura de 360 px, tablet, desktop e palco em 1280 × 720 e 1920 × 1080, inclusive com nomes/títulos longos e zoom.

## Textos de interface propostos

| Situação | Texto |
| --- | --- |
| Busca | “Qual música você quer cantar?” |
| Adição concluída | “Música adicionada! Acompanhe sua vez na fila.” |
| Ajuste de prioridade | “A fila dá prioridade a quem cantou menos.” |
| Sem votos | “Desta vez não tivemos votos.” |
| Nota perfeita | “Nota 10! Quer cantar mais uma?” |
| Reconexão | “Reconectando… suas músicas continuam na sala.” |
| Vídeo falhou | “Não foi possível tocar este vídeo. O anfitrião pode escolher outro.” |

## Entrega esperada de design

Protótipo navegável com jornadas de anfitrião, participante e palco; componentes e tokens; variações responsivas; estados de rede, vazio, erro, votação encerrada e GIF indisponível. Critério de revisão: nenhuma regra do documento 02 depende de uma tela ou estado não representado.
