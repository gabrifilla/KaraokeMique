# 02 — Regras do jogo e consistência

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

As regras explicitamente pedidas são a base. Valores e comportamentos adicionais abaixo são **propostas v1**, listadas para revisão no documento 09.

## Sala, identidade e presença

- Criar sala gera identificador interno, código público aleatório e participante anfitrião em uma transação.
- QR code contém somente link de convite HTTPS; nunca uma credencial de administração.
- Entrada pede apelido de 2 a 24 caracteres e avatar. Apelidos iguais recebem um discriminador visual.
- O identificador do participante é estável durante a sala e independente da conexão WebSocket.
- Uma sessão pode abrir várias abas; continua sendo uma pessoa e tendo um voto por apresentação.
- Sem login, perder a sessão local pode impedir recuperação da identidade. Reentrar não elimina registros anteriores e pode ser moderado pelo anfitrião.
- Ao sair explicitamente, os itens pendentes ficam suspensos. Ao cair a conexão, há tolerância de 60 segundos antes da suspensão. Reconexão restaura a elegibilidade dos itens.
- Uma sala tem exatamente um anfitrião. Transferência exige ação explícita; não eleger automaticamente um desconhecido por ordem de entrada.

## Estados da sessão

| Estado | Significado | Próximo passo |
| --- | --- | --- |
| LOBBY | Aguardando músicas ou decisão de começar | Preparar primeira apresentação |
| PREPARING | Cantor e vídeo selecionados, aguardando início | PLAYING após confirmação do palco |
| PLAYING | Apresentação em andamento | VOTING ao terminar normalmente |
| PAUSED | Apresentação pausada | Retornar a PLAYING |
| VOTING | Janela de notas aberta | RESULTS por prazo ou conclusão |
| RESULTS | Resultado final e eventual bônus | PREPARING ou LOBBY |
| RECOVERY | Palco ausente ou reprodução em falha | Retomar, substituir ou cancelar com anfitrião |
| CLOSED | Sala encerrada | Somente resumo até expirar |

O anfitrião pode encerrar a sala de qualquer estado. A transição é atômica e invalida ações posteriores. No fechamento durante votação, votos recebidos são finalizados com motivo `ROOM_CLOSED`; o resultado é mostrado no resumo, sem conceder bônus.

Proposta: resultado fica visível por pelo menos 5 segundos; anfitrião aciona “Próxima música”. O servidor também verifica esse intervalo mínimo antes de preparar a próxima apresentação. Não avançar automaticamente enquanto o grupo ainda está se preparando.

## Fila justa: algoritmo proposto

### Objetivo e precedência

Priorizar quem teve menos oportunidades de cantar. Preservar ordem de entrada quando as oportunidades são iguais. A ordem global de chegada cede à justiça e ao bônus explicitamente previsto.

Ordem de seleção:

1. Um item promovido por bônus válido, se elegível.
2. Participante elegível com menor `turnsConsumed`.
3. Empate: menor sequência de entrada do primeiro item pendente dessa pessoa.
4. Empate defensivo: identificador estável do participante.

Dentro de cada pessoa, sempre escolher seu item elegível mais antigo. A adição de várias músicas não reserva vários turnos consecutivos.

`turnsConsumed` começa em zero e aumenta quando a apresentação efetivamente começa, após confirmação `PLAYING` do palco, uma única vez. Uma apresentação pulada voluntariamente depois de iniciada consome turno; uma falha técnica cancelada pelo anfitrião devolve o turno uma única vez. Pausa e reconexão não contam novamente.

Para prever a fila inteira: copiar os contadores, escolher a próxima pessoa, incrementar seu contador simulado, remover o item escolhido e repetir. **Não ordenar todos os itens apenas pelo contador real**, pois isso agruparia músicas da mesma pessoa incorretamente.

### Exemplo verificável

Com todos em zero e entradas `A1, A2, A3, B1, C1, B2`, a previsão é:

`A1 → B1 → C1 → A2 → B2 → A3`.

Se A já cantou duas vezes e B uma vez, e C chega sem ter cantado, com fila `A3, B2, C1, C2`, a previsão é:

`C1 → B2 → C2 → A3`.

Depois de C1, B e C empatam em um turno; B2 entrou antes de C2. Depois de B2, C continua tendo menos turnos que A.

### Recalcular sem interromper

Adicionar, remover, suspender, restaurar e conceder bônus recalculam a previsão. O item em PREPARING já está reservado e não é deslocado por nova chegada. O vídeo em andamento nunca muda por recálculo.

Não há reordenação manual geral no MVP. O anfitrião pode remover um item ou cancelar uma preparação com motivo; isso evita uma segunda política de prioridade difícil de explicar.

### Limites iniciais de proteção

Proposta: 5 músicas pendentes por pessoa e 100 por sala. São parâmetros de produto, não parte do pedido original. Canções iguais de pessoas diferentes são permitidas, com aviso de repetição. A mesma pessoa não adiciona o mesmo vídeo duas vezes enquanto ele estiver aguardando ou tocando.

Participantes suspensos, removidos ou ausentes após tolerância não entram na seleção. Se ninguém elegível tem música, voltar a LOBBY. Nova chegada sempre começa com zero: isso favorece iniciantes, mas pode postergar veteranos se houver entrada contínua; monitorar antes de introduzir envelhecimento de prioridade.

## Votação

1. Apenas um evento de término válido do palco autorizado abre a votação da apresentação atual. Eventos duplicados são ignorados.
2. O servidor salva `openedAt` e `deadlineAt = openedAt + 10 segundos`.
3. Elegíveis são participantes ativos/conectados no instante da abertura, exceto o cantor. O anfitrião pode votar se não estiver cantando.
4. O conjunto de elegíveis é congelado. Entrantes posteriores aguardam a próxima votação. Uma queda posterior não remove o direito de votar se a mesma pessoa voltar antes do prazo.
5. Nota deve ser inteira entre 0 e 10. Cada pessoa tem um único voto final e imutável; selecionar a nota e confirmar são ações distintas.
6. Fechar no primeiro evento entre todos os elegíveis terem votado e o prazo terminar. Se não houver elegíveis, fechar imediatamente sem nota.
7. O instante de aceitação é a validação no servidor depois de adquirir o bloqueio da sala. Aceitar somente se `serverNow < deadlineAt` e a votação continuar aberta. Não confiar no relógio do celular.
8. O resultado usa `soma / quantidade de votos válidos`, com uma casa decimal para exibição. Sem votos: “Sem votos”, média nula. Abstenção nunca equivale a zero.
9. Votos individuais não aparecem para o grupo. Durante a janela, mostrar somente quantidade recebida e tempo restante.

Exemplo: `8, 9, 10` produz média `9,0`; `10, 10, 9` produz `9,7`. Notas 0 são válidas e entram no denominador.

Uma pessoa removida da sala durante a votação é retirada do conjunto elegível e seu voto, se existente, invalidado, com auditoria administrativa. O restante do conjunto permanece congelado. A mudança pode fechar a janela se todos os restantes já votaram. Um resultado já finalizado não é reaberto.

## Nota 10 e bis

Interpretação proposta: **média exata igual a 10**, calculada com inteiros (`sum = 10 × count`), com pelo menos **dois votos válidos**. A média arredondada exibida não concede bônus. Exemplo defensivo: 29 notas 10 e uma nota 9 exibem 10,0, mas não concedem bis.

Ao fechar a votação:

- Se o cantor tiver item elegível já pendente, criar uma oferta de bis vinculada ao mais antigo. Itens adicionados depois do fechamento não contam.
- O cantor pode aceitar ou recusar enquanto RESULTS está aberto. O anfitrião vê o estado e pode seguir; iniciar a preparação seguinte expira a oferta ainda não aceita.
- Ao aceitar, promover esse item para a próxima apresentação. Aceitar novamente retorna o mesmo resultado, sem novo efeito.
- Se o item for removido ou a pessoa se tornar inelegível, cancelar o bônus, sem transferi-lo para uma música diferente.
- Não acumular créditos de bônus para o futuro.
- Regra atualizada em 09/11/2026: após um bis, o cantor precisa aguardar quatro apresentações concluídas para poder ganhar outra prioridade com uma nova nota perfeita. O próprio bis e músicas puladas/canceladas não contam. A contagem sobrevive à reconexão; as músicas restantes seguem a fila normal. Veja [cooldown e consumo da prioridade](20-bis-unico-na-sala.md).

Essa proteção e o mínimo de dois votos são sugestões de equilíbrio; alteram o comportamento de salas de duas pessoas e precisam de revisão explícita.

## Reprodução, interrupção e falha

- Uma sala tem um único palco autorizado a emitir estado de reprodução. Cada pareamento recebe um `playbackEpoch` crescente; eventos de palco antigo são recusados.
- Selecionar a música reserva o item e cria a apresentação em PREPARING, ainda sem `startedAt`. O comando de início solicita reprodução; só a confirmação do player define `startedAt` e consome turno.
- Término natural abre votação. O servidor verifica sala, apresentação, epoch e estado, mas não consegue provar que um cliente autorizado é honesto; este é um jogo casual com anfitrião confiável.
- Pular uma apresentação iniciada, por decisão do cantor/anfitrião, termina sem nota e sem bônus; mantém turno consumido.
- Cancelar por falha técnica não gera votação nem nota; devolve turno se ele havia sido consumido. Item fica FAILED, permitindo substituir o vídeo por uma nova tentativa ligada à original.
- Cancelamento antes de iniciar não consome turno.
- Não iniciar votação apenas porque a duração estimada acabou: pausas, buffering e anúncios podem alterar o tempo observado. Ao detectar travamento, entrar em RECOVERY e oferecer decisão ao anfitrião.
- Buscar/avançar manualmente dentro do vídeo não é um controle do app no MVP; controles nativos do provedor podem continuar acessíveis.

Se o cantor sair ou for removido durante PREPARING, cancelar a reserva sem consumir turno. Se sair durante PLAYING, o anfitrião decide concluir ou pular; a ausência não abre votação sozinha. Se já estiver em VOTING, finalizar os votos elegíveis normalmente, sem conceder bônus a participante removido ou ausente além da tolerância.

## Ausência do anfitrião e encerramento

Queda do celular do anfitrião não interrompe um palco saudável. Apresentação e votação podem terminar, mas nenhuma nova apresentação começa sem anfitrião reconectado ou transferência anterior.

Se o palco ficar sem heartbeat por 15 segundos durante PREPARING, PLAYING ou PAUSED, entrar em RECOVERY e bloquear avanço. Durante VOTING, o prazo e o fechamento continuam normalmente; em RESULTS ou LOBBY, apenas bloquear a preparação seguinte até restaurar o palco. O palco deve pausar localmente ao detectar perda de conexão; se isso falhar, ao reconectar deverá reconciliar antes de continuar. O servidor não promete controlar um navegador desconectado.

Proposta: encerrar sala após 2 horas sem qualquer cliente conectado, com limpeza assíncrona. Sessões ativas não expiram no meio de uma apresentação. Transferência voluntária deve ser oferecida antes de o anfitrião sair.

Não permitir que o anfitrião remova a própria identidade; ele deve transferir o comando para um participante ativo/conectado ou encerrar a sala. Ações de moderação não podem deixar a sala sem anfitrião. Alterações de abertura de entrada/reação valem imediatamente; configurações que mudam pontuação, fila ou elegibilidade ficam fixas durante toda a sessão na primeira versão.
