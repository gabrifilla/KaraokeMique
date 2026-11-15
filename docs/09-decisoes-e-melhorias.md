# 09 — Registro de decisões, pendências e melhorias

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

## Como ler este registro

“Requisito” veio do pedido. “Proposta” completa detalhes ainda não definidos. “Dependência” exige verificação externa. Nenhuma proposta neste documento representa aprovação presumida do idealizador.

## Decisões de produto para revisão

| ID | Tema | Recomendação inicial | Situação/impacto |
| --- | --- | --- | --- |
| DP-01 | Modo de uso | Tela compartilhada de palco; cada jogador acessa o site pelo próprio celular via QR da sala | Confirmado pelo idealizador; QR sempre visível durante a sessão |
| DP-02 | Identidade | Sessão anônima por navegador, sem conta obrigatória | Proposta; menos atrito, menor resistência a múltiplas identidades |
| DP-03 | Intervalo de notas | Inteiros de 0 a 10 | Proposta de detalhe; pedido definiu faixa, não granularidade |
| DP-04 | Autovoto | Cantor não vota em si | Proposta; reduz favorecimento direto |
| DP-05 | Nota 10 | Média exata 10, nunca apenas nota individual ou arredondamento | Interpretação proposta do pedido |
| DP-06 | Mínimo para bis | Dois votantes válidos | Proposta; sala com dois participantes não concede bônus |
| DP-07 | Repetição de bis | Um bis consecutivo por pessoa | Proposta de equilíbrio; limita sequência de notas perfeitas |
| DP-08 | Momento do bônus | Música já aguardando ao fechar votação, aceite antes da próxima preparação | Proposta; não guardar crédito futuro |
| DP-09 | Fila justa | Menos turnos consumidos, desempate por entrada; FIFO por pessoa | Formalização proposta do pedido |
| DP-10 | Consumo de turno | Início real conta; skip mantém; falha técnica devolve | Proposta que impede pular para preservar vantagem |
| DP-11 | Avanço | Anfitrião inicia próxima após resultado de ao menos 5 s | Proposta; oferece tempo para trocar cantor |
| DP-12 | GIFs | GIPHY como primeiro candidato; catálogo pesquisável | Fornecedor depende da prova técnica e condições comerciais |
| DP-13 | Liberdade de GIF | Sem seleção fixa; rating inicial sugerido pg-13 | Rating e limites técnicos são propostas a revisar diante do pedido de liberdade |
| DP-14 | Limites da sessão | 30 pessoas; 5 músicas pendentes/pessoa; 100/sala | Proposta de capacidade e proteção, ajustável |
| DP-15 | Duração de música | Máximo 15 min; sem live ativa | Proposta para preservar ritmo |
| DP-16 | Elegibilidade de voto | Congelada ao abrir; só ativos/conectados, exceto cantor | Proposta; entrantes posteriores não votam |
| DP-17 | Histórico | Resumo da sala por 24 h, sem perfil permanente | Proposta de minimização de dados |
| DP-18 | Compatibilidade de palco | Computador em navegador, ligado à TV | Proposta; apps de TV, casting e browser de TV ficam para validação futura |

As regras podem ser configuráveis futuramente. Para a primeira implementação, preferir uma configuração padrão clara a um painel com dezenas de opções que multiplique cenários e testes.

## Registro arquitetural

| ADR | Decisão proposta | Motivo e consequência |
| --- | --- | --- |
| ADR-01 | Monólito modular | Mantém fila, voto e transições numa fronteira transacional; evolução sem microserviços prematuros |
| ADR-02 | React/Vite no frontend | SPA atende ao núcleo; backend persistente separado do build web |
| ADR-03 | PostgreSQL como autoridade | Restrições e transações protegem concorrência; estado de conexão não substitui dados duráveis |
| ADR-04 | Comandos idempotentes e outbox | Recuperação de falhas sem duplicar música, voto ou bônus |
| ADR-05 | Um palco por sala com epoch | Evita dois dispositivos concorrendo por término/início |
| ADR-06 | Prazo persistido no servidor | Troca de aba, relógio local e reinício não estendem votação |
| ADR-07 | Busca/mídia de GIF pelo cliente | Integração compatível com o fluxo documentado do fornecedor; fan-out precisa de teste |
| ADR-08 | Sem microfone e afinação no MVP | Pedido usa voto social; captura e análise de voz criariam outro produto técnico |

## Dependências que impedem prometer produção agora

| ID | Dependência | Evidência necessária |
| --- | --- | --- |
| DE-01 | Quota de busca YouTube suficiente | Valores do projeto e cenário de uso calculado |
| DE-02 | Reprodução nos dispositivos do piloto | Testes reais de autoplay, erro e término |
| DE-03 | Acesso GIPHY em produção | Condições aceitas, chave adequada e custo conhecido |
| DE-04 | Envio de GIF por ID viável | Fluxo funcional e consumo medido por receptor |
| DE-05 | Mecânica e contexto de uso compatíveis com fornecedores | Revisão das políticas e eventuais esclarecimentos necessários |
| DE-06 | Orçamento e volume esperado | Quantidade de salas simultâneas, uso diário e teto mensal |

Esses itens não impedem planejar telas e domínio, mas precisam ser resolvidos antes de anunciar disponibilidade ou capacidade comercial.

## Melhorias sugeridas

| Ideia | Benefício | Momento sugerido |
| --- | --- | --- |
| Modo sem competição | Manter fila e reações sem pressionar quem não quer nota | Após validar o modo principal |
| Aviso “você é o próximo” | Evitar intervalos longos procurando o cantor | MVP se simples, com aviso dentro do app |
| Confirmar presença do próximo cantor | Suspender temporariamente quem saiu para não travar a festa | Depois do piloto, avaliar atrito adicional |
| Favoritos recentes da sessão | Reduzir buscas repetidas e ajudar escolha | Após política de metadados e quota validada |
| Duetos | Permitir apresentações compartilhadas | Futuro; exige definir contadores, elegibilidade e divisão do bis |
| Destaques positivos | Celebrar apresentação mais animada, maior participação e nota da noite | Futuro; evitar ranking constrangedor por padrão |
| Perfil opcional do anfitrião | Recuperar comando após perder dispositivo | Futuro; não tornar login obrigatório ao grupo |
| Modo econômico de dados | Reduzir animações e receber GIF só no palco | Avaliar no piloto junto da quota |
| Regras visíveis por sala | Explicar fila, voto e bis em uma tela curta | MVP recomendado |

Recomendação mais importante para o jogo: tornar a justiça da fila visível. Se a ordem mudar sem explicação, participantes podem interpretar a regra correta como erro ou privilégio do anfitrião.

## Questões para a próxima revisão

1. Para nota perfeita, fazem sentido os dois votos mínimos e o limite de um bis consecutivo?
2. A classificação sugerida para GIFs atende ao grupo ou a sala deve ter configuração diferente?
3. Qual volume de salas e orçamento devemos considerar no primeiro lançamento?

É possível seguir desenhando protótipos com os padrões propostos, desde que identificados como revisáveis. Antes de implementar as mecânicas centrais e contratar infraestrutura, consolidar essas respostas no registro de decisões.
