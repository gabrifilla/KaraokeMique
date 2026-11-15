# Fila automática e conexão da TV

Alteração solicitada em 08/11/2026. Este documento substitui os fluxos anteriores que exigiam preparar cada música, mostravam a próxima voz no celular ou escondiam o palco em Pessoas.

## Reprodução

A fila automática vem habilitada (`settings.autoPlay`, ausente em salas antigas equivale a habilitado). Um worker da API procura salas em lobby/resultado e prepara a primeira música elegível segundo a fila justa. Exige palco pareado com heartbeat recente e revalida o vídeo no YouTube antes da transação. Dentro do lock da sala, confere novamente estado, configuração e próxima música: concorrência não reserva duas apresentações nem consome dois turnos. O turno continua dependendo do relatório real PLAYING do palco.

O resultado dura pelo menos cinco segundos. Havendo oferta de bis, a decisão pode ser tomada durante dez segundos contados do fechamento da votação. Aceitação preserva a prioridade de bis; recusa libera o avanço após o tempo mínimo de resultado; silêncio expira a oferta ao completar dez segundos. O automático nunca inicia no meio de votação, pausa, recuperação ou encerramento. Fila vazia espera novas músicas.

Cancelamento técnico desliga o automático; a configuração pode ser reativada pelo anfitrião. Erro de validação do fornecedor também desliga o automático, informa a falha e mantém a fila, evitando repetição contínua de requisições. Pular uma música permite seguir para a próxima. O anfitrião pode desligar o automático a qualquer momento e ainda dispõe dos controles manuais.

O player aguarda prontidão e conexão antes de tentar iniciar. Relatórios são enviados em ordem para evitar inversão entre PLAYING/PAUSED/ENDED. Em demo, o início é simulado; não há vídeo/áudio real. Autoplay com áudio continua sujeito à permissão do navegador.

## Palco e celulares

No palco: QR compacto; Próximas vozes acima do GIF recebido; fila com rolagem. A coluna lateral ficou mais larga, reduzindo um pouco a largura do vídeo. Em telas de 720p ou maiores, QR e código ficam lado a lado para liberar altura. A mídia do GIF tem limites explícitos e `object-fit: contain`, incluindo GIFs verticais. É possível minimizar/expandir o card localmente.

O QR de convite para os jogadores aparece somente no palco. Foi removido das telas dos participantes e do anfitrião; o código textual da sala continua no cabeçalho. O QR de autorização da TV, antes do pareamento, continua fazendo parte do fluxo de conexão.

Enquanto um GIF está ativo, sua área lateral ganha largura e altura, com tamanhos adequados a 720p e 1080p. O palco prefere a versão `original.webp` do GIPHY e dispõe de alternativas `downsized_medium`, `downsized` e `fixed_height`, em vez de depender somente da miniatura. Se a mídia preferida falhar, tenta a alternativa GIF compatível. A busca dos jogadores continua leve. A escolha das versões segue o [guia de rendições do GIPHY](https://developers.giphy.com/docs/optional-settings/#rendition-guide), sem proxy ou alteração da mídia.

**Ampliar GIF** abre a imagem completa na área principal, mantendo QR e fila na lateral, sem pausar a música. Há botão de fechar e Escape; o foco retorna ao botão de ampliação. A visualização fecha quando a reação expira, é ocultada ou chega um novo GIF. O prazo de cinco segundos não é prolongado. Essa opção facilita ler GIFs muito verticais, panorâmicos ou com letras pequenas, sem recortar a mídia. [Exemplo vertical ampliado](screenshots/stage-gif-expanded.png).

A chegada do GIF expande suavemente a coluna lateral e revela o card em 320ms, evitando o salto de tamanho do player/fila. A abertura de **Ampliar GIF** usa escala e fade de 280ms a partir da direita. A coluna também retorna suavemente ao tamanho normal quando o GIF sai. `prefers-reduced-motion` desliga essas transições e animações; os prazos de exibição e os controles permanecem iguais.

O GIF exibe **Enviado por {nome}**. O nome vem da identidade autenticada no servidor, não de um campo fornecido pelo remetente. Expiração continua em cinco segundos; minimizar não renova o prazo. No celular, emojis e GIFs têm cards separados. O card de GIFs inicia recolhido, pode ser expandido/minimizado e mantém termo/resultados ao minimizar. Os emojis permanecem disponíveis.

Celulares não exibem a previsão de próximas vozes. Participantes têm **Minhas músicas**, com os próprios pedidos pendentes e remoção, sem posição global. O anfitrião pode gerenciar os pedidos em uma lista administrativa, sem apresentá-la como previsão de quem canta a seguir.

## Acesso ao palco

Ao criar a sala, o card **Conectar TV ou abrir palco** aparece na tela principal somente enquanto nenhum palco foi pareado (`epoch === 0`). Depois do primeiro pareamento, o card sai da tela principal, inclusive durante uma desconexão; a reconfiguração continua pela aba **Palco** do anfitrião. Moderação fica em **Gerenciar**. O botão **Usar esta tela como palco** faz a autorização e o pareamento seguro com um toque, preservando o cookie de membro para voltar à administração.

Na TV, a entrada inicial **Usar como palco** abre `/stage/tv`. A TV recebe um desafio de seis dígitos, válido por cinco minutos, e um segredo aleatório de dispositivo guardado em cookie HttpOnly. O QR abre `/connect-tv` no celular. O anfitrião vê somente salas para as quais possui uma sessão de anfitrião válida e confirma qual será exibida. Se ainda não criou a sala, pode criá-la pelo fluxo e informar o código já preenchido na tela Palco. Também pode digitar os seis dígitos no próprio celular, sem usar teclado na TV.

O código curto sozinho não concede uma sessão de palco: exige aprovação do anfitrião e posse do segredo do dispositivo no polling. Desafios ficam no PostgreSQL com hash do segredo, validade e consumo. A autorização é recusada para outro participante, sala encerrada, código expirado ou desafio já destinado a outra sala. O resgate substitui o palco anterior, incrementa epoch e mantém as regras de recuperação. O servidor limita criação, aprovação e polling; registros vencidos são removidos na manutenção. A TV navega automaticamente após a autorização.

O código autorizado de 24 caracteres permanece em **Outras formas de conectar**, com dois minutos e uso único. A exceção solicitada para desenvolvimento continua restrita a `NODE_ENV=development` e sala explícita. O novo fluxo de TV funciona também em produção sem dispensar autenticação do anfitrião.

## Integração real e validação

O endereço da revisão é `http://karaoke.192.168.0.122.sslip.io:5176`. A mudança para hostname corrigiu o vídeo que retornava erro 150 pelo IP; não há proxy de mídia nem identificação de cliente forjada. O relatório real confirma busca YouTube, início automático sem preparar/tocar manualmente, GIF real carregado e término via IFrame após seek técnico. Código original do YouTube aparece no diagnóstico de erro.

Testes de domínio/banco cobrem espera de resultado/bis, presença do palco, pausa, concorrência, fila preservada quando o provedor falha, segredo do dispositivo, autorização do anfitrião, expiração e revogação. E2E cobre conexão por seis dígitos, aprovação pelo destino do QR, abertura direta com um toque, avanço automático da próxima música, pausa/retomada, GIF com remetente/minimização, votação/bis e reconexão.

O E2E usa banco próprio e não altera as salas da revisão. O serviço atual suporta uma instância de API por banco; servidores locais antigos foram encerrados para evitar competição entre workers/outbox. Antes de publicação continuam necessários ensaios de áudio/autoplay nos aparelhos reais, navegador da TV, distância de leitura do QR e aprovação dos fornecedores.

Validação final: 40 testes de domínio/adaptador/banco/diagnóstico, 3 cenários E2E, build e formatação aprovados. QR, código e alternativa de pareamento ficam inteiramente visíveis em 1280×720. A prova com YouTube/GIPHY reais está em [real-spike-result.json](real-spike-result.json). Prévias locais: [pareamento da TV](screenshots/tv-connect.png), [GIF completo com remetente e fila acima](screenshots/stage-gif-sidebar.png) e [celular](screenshots/mobile.png). As capturas E2E identificam o player simulado.

Validação dos ajustes de limpeza e ampliação: 4 cenários E2E aprovados, incluindo ausência do QR nos celulares, card de conexão apenas antes do primeiro palco, GIF vertical em resolução de envio, ampliação maior que 400px de altura sem cobrir o QR, fechamento por Escape e controles laterais inteiramente visíveis em 720p. Build e formatação aprovados. Uma consulta independente ao GIPHY real confirmou carregamento da versão `original.webp`; o E2E usa catálogo/imagem de fornecedor simulados e transmissão Socket.IO real.
