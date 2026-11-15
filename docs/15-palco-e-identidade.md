# Karaoke Míque — palco focado na música

Alteração solicitada pelo usuário em 08/11/2026. Nome adotado: **Karaoke Míque**. Slogan: **“Solta a voz, pede Bis”**. Aplicados à marca, ao título do navegador, à entrada e à assinatura do palco.

## Composição do palco

O palco não tem header. A música atual usa título e cantor em uma faixa curta, com o player ocupando a maior área disponível. Expansão e conexão ficam discretamente na lateral. O aviso de demonstração permanece identificado quando o player é simulado.

Na direita: convite compacto com QR branco e código; lista completa das próximas músicas imediatamente abaixo, com rolagem; GIF recebido em um destaque independente na mesma coluna. O destaque GIF só ocupa espaço quando há mídia para exibir. O QR continua visível no lobby, preparação, reprodução, pausa, votação, resultado e recuperação.

O QR mede 148px no palco 720p, com margem branca adicional; em telas maiores passa a 170px. O card é menor que o anterior. A leitura em distância real de TV ainda precisa de piloto físico.

## Reações

Emojis aparecem sobre a área principal. A posição, deslocamento lateral, tamanho e pequena rotação são sorteados uma vez no recebimento. O movimento tem queda, quique e desaparecimento gradual, até o prazo de 5s do evento. Re-renderizações do relógio não alteram a posição ou reiniciam a animação.

A sobreposição tem `pointer-events: none`, fica restrita à coluna principal e não cobre o QR, a fila ou os GIFs. As posições finais ficam na região central, acima dos controles inferiores do player. Não há faixa de reações ou fila de reprodução visual.

O palco mantém até oito emojis e um GIF recente simultâneos. Um GIF novo substitui o anterior; rajadas de emoji não removem o GIF. O prazo original vale mesmo se a resolução do provedor demorar. Reações vencidas não são repetidas. O controle “Ocultar reações nesta tela” limpa a exibição; preferência por movimento reduzido inicia esse controle ativado, com opção de exibição estática dos emojis ao reativar.

GIFs continuam pesquisados e resolvidos diretamente pelo navegador via GIPHY, por ID, com atribuição e sem proxy de mídia. Backend, notas, fila justa e limites de envio não foram alterados.

## Verificação local

O E2E verifica nome/título, ausência de header no palco, vídeo maior que 75% da largura e 70% da altura da viewport de 1280×720, card QR abaixo de 260px de altura, fila abaixo do convite e ausência de interseção entre QR e player. Também verifica dois emojis com posições diferentes, overlay sem captura de cliques, expiração automática, GIF na lateral e ocultação local. Os cenários continuam cobrindo voto, bis, reconexão, moderação e expansão, incluindo 1920×1080.

No teste E2E, somente o catálogo e a imagem GIPHY são fixtures; a transmissão das reações por Socket.IO é real. O servidor desse teste recebe uma chave web fictícia, explicitamente identificada como tal. A prova separada `scripts/real-spike.ts` usa integrações reais quando configuradas.

Prévias: [emojis sobre a música](screenshots/stage-emoji-overlay.png), [GIF na lateral](screenshots/stage-gif-sidebar.png), [palco 1080p](screenshots/stage-1080p.png). As capturas de demo usam player simulado, identificado na própria tela.

Build e formatação aprovados, 32 testes de domínio/adaptador/banco e 2 cenários E2E aprovados. A prova real foi repetida na nova composição: busca YouTube com 12 resultados, PLAYING, busca/resolução GIPHY com mídia carregada à direita e ENDED real após seek técnico. [Relatório](real-spike-result.json) e [palco com vídeo e GIF reais](screenshots/real-stage.png).

Esta composição substitui as propostas anteriores de header e faixa inferior de reações nos documentos 03/14 e nas antigas telas de Figma. O arquivo de Figma continua aguardando sincronização por cota do MCP; o código e estas evidências são a referência atual.

## Início automático da música

Correção de 08/11/2026: antes, o player apenas sinalizava que estava pronto e aguardava “Tocar no palco”. Agora, ao preparar uma música, solicita `playVideo()` no evento `onReady`, com som. Comandos de início recebidos durante o carregamento são preservados até a prontidão. Somente o evento real `PLAYING` confirma a reprodução e aplica o turno no servidor.

Pausa, desconexão, recuperação, votação e encerramento cancelam a intenção de início. Uma tela recarregada durante pausa ou recuperação não inicia automaticamente. Se a política do navegador bloquear o som, o evento `onAutoplayBlocked` apresenta aviso e botão **Ativar som e iniciar**. Não se inicia o vídeo silenciado para contornar a restrição. O botão extra não ocupa espaço durante a reprodução normal.

No demo, a prontidão e o início são simulados automaticamente; término e falha continuam disponíveis como ações de teste. O E2E passa a exigir `PLAYING` sem clique no palco tanto na primeira música quanto na próxima, mantendo as verificações de pausa/retomada, reconexão, votação e bis. A prova `scripts/real-spike.ts` também deixou de clicar para tocar: o relatório de 08/11/2026 às 21:19 UTC confirmou `autoplay: true` com YouTube real, sem flags para liberar autoplay. Essa evidência é de Chromium headless; áudio em TV e outros navegadores permanece sujeito ao ensaio físico.

## Pareamento simplificado em desenvolvimento

Solicitação de 08/11/2026: com `NODE_ENV=development`, o palco aceita qualquer código não vazio (até 128 caracteres) quando recebe explicitamente o código de 8 caracteres da sala. O link **Abrir palco de desenvolvimento**, na administração, preenche essa sala. A página mostra o aviso de desenvolvimento; o modo é obtido pela API. Não há escolha automática da última sala criada.

O atalho dispensa autorização temporária, expiração e consumo de código somente nesse ramo. Mantém CSRF, limites de requisição, existência/estado da sala, cookie de palco, revogação do palco anterior, epoch e recuperação da apresentação. Sem sala explícita, o fluxo normal continua disponível. Produção, teste, ambiente ausente ou qualquer outro valor não habilitam o atalho; informar uma sala no payload não evita a validação normal. `pnpm dev` usa uma entrada dedicada que define desenvolvimento somente se `NODE_ENV` estiver ausente; `pnpm start:api` não define esse valor.

Testes de PostgreSQL cobrem o destino com várias salas abertas, rejeição de código vazio e ausência do atalho em produção/teste/ambiente ausente. O E2E da sessão usa `teste` pelo link de desenvolvimento; o E2E de segurança mantém o fluxo estrito, incluindo uso único e revogação do palco anterior.

Validação desta alteração: 35 testes automatizados, 2 cenários E2E, build e formatação aprovados. No servidor real da rede local em `192.168.0.122:5176`, o fluxo de interface também conectou uma sala de teste usando `qualquer coisa`, sem gerar autorização de palco. A sala de verificação foi encerrada após o teste.
