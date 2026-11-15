# 07 — Qualidade, segurança e operação

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

Os números abaixo são metas iniciais para orientar implementação e ensaio de carga. Não representam SLAs contratados ou resultados já medidos.

## Metas de serviço

| Aspecto | Meta inicial | Como verificar |
| --- | --- | --- |
| Resposta de comando interno | p95 ≤ 300 ms, sem chamada externa | Tempo servidor, da entrada até commit |
| Propagação de estado | p95 ≤ 500 ms em rede de teste saudável | Comando aceito até renderização em outro cliente |
| Fechamento de votação | Nenhum voto aceito após deadline; publicação p95 ≤ 500 ms depois | Relógio do servidor e histórico de rodada |
| Reconexão | Estado convergente ≤ 3 s após reconexão de transporte | Queda simulada e comparação de snapshots |
| Carga do beta | 20 salas × 30 membros, mais um palco por sala | 620 conexões, busca externa simulada e rajadas de voto |
| Frontend móvel | Interação de controles responsiva em dispositivo intermediário | Perfil de performance sem vídeo no celular |
| Recuperação de dados | RPO proposto ≤ 24 h e RTO ≤ 4 h | Restore de backup em homologação |

Tempos de busca/mídia externa devem ser medidos separadamente. A disponibilidade do jogo depende também da rede local e dos provedores. A meta de backup não garante continuidade de uma festa em caso de desastre; para isso, seria necessário orçamento e desenho de recuperação mais rigorosos.

## Segurança por fronteira

**Sessão:** cookie Secure, HttpOnly e SameSite apropriado; HTTPS obrigatório; proteção CSRF em mutações; validar Origin no handshake de socket. Não pôr token de sessão em URL, QR ou logs.

**Autorização:** membro pode agir apenas na sua sala; palco tem escopo de reprodução; ações administrativas verificam anfitrião atual em cada comando. Remoção revoga sessão e desassocia sockets. Sessão de palco não tem direito a voto.

**Entrada:** schemas de tamanho/tipo, escaping de apelidos/títulos, ausência de HTML arbitrário, IDs do YouTube/GIPHY em vez de URLs fornecidas pelo usuário. Não fazer fetch genérico de URL para evitar SSRF.

**Convite:** código público não é senha administrativa. Proposta: 8 caracteres de alfabeto sem símbolos ambíguos, limite de tentativas por origem e sessão, opção de fechar novas entradas. A proteção contra alguém se passar por várias pessoas é limitada sem conta; anfitrião precisa poder remover e bloquear reentrada da sessão.

**Palco:** código de pareamento aleatório, validade de 2 minutos, consumo único e aprovação no dispositivo do anfitrião. Novo palco invalida o anterior por epoch e revogação. Evitar que conhecer o código público da sala permita tomar a reprodução.

**Conteúdo e dependências:** CSP com origens efetivamente necessárias, permissões de iframe mínimas, política de referrer compatível com integração, dependências com lockfile e atualizações revisadas. Não exibir stacktrace para o usuário.

## Limites iniciais de tráfego — propostas revisáveis

| Ação | Valor inicial | Comportamento ao atingir |
| --- | --- | --- |
| Busca de música | 6/min por pessoa + orçamento compartilhado de quota | 429 com espera e mensagem clara |
| Criação de sala | 5/h por origem, ajustável para redes compartilhadas | Espera temporária; acompanhar falsos positivos |
| Tentativas de entrada | 20/min por origem | Reduzir abuso sem banir permanentemente o Wi-Fi da festa |
| Emoji | 3/s por pessoa, burst 6 | Descartar excesso com ACK de limite |
| GIF | 1 a cada 3 s por pessoa | Pedir para aguardar; não alterar total permitido da sessão |
| Exibição no palco | Até 8 emojis em overlay e 1 GIF na lateral | Descartar emojis excedentes antigos; um novo GIF substitui o anterior |
| Vida visual da reação | Até 5 s | Remover localmente e não reproduzir após reconexão |

Limites locais não aumentam a quota do provedor. Não permitir que uma fila interna de reações cresça indefinidamente. Anfitrião pode desligar reações e participante pode ocultar animações na própria tela.

## Privacidade e retenção

Coletar somente dados necessários à sessão. Informar, em linguagem simples, que mídia e buscas usam serviços externos. Definir aviso de privacidade e canal de solicitação de exclusão antes do acesso público. Apelidos e votos vinculados a uma sessão merecem o mesmo cuidado operacional de outros dados de participante.

Retenção proposta no documento 05 deve virar rotina executável com métricas de sucesso/falha. Exclusão/anomização em banco ativo, logs e ciclo de expiração dos backups precisa ser descrita com precisão. Não afirmar conformidade legal completa apenas por seguir este planejamento.

## Estratégia de testes

| Nível | Cobertura necessária |
| --- | --- |
| Unidade de domínio | Fila por contador e sequência; simulação de posições; bônus; cálculo de nota; transições legais |
| Propriedades | Pessoa com mais músicas não monopoliza empate; nenhuma nota fora da faixa; bônus não cria item; contadores nunca negativos |
| Integração de banco | Votos concorrentes, deadline, idempotência, lock de sala, outbox e tentativa dupla de iniciar |
| Contrato | Schemas de HTTP/socket, projeções por papel, payload inválido e versões incompatíveis |
| E2E multicliente | Anfitrião, dois ou mais participantes e palco em contextos separados |
| Falhas | Queda de rede/processo, publicação repetida, provedor indisponível e novo palco |
| Manual | Celulares reais, som da TV, foco, leitor de tela, QR a distância e autoplay |

### Casos críticos numerados

QA-01: consulta `right through me` recebe sufixo; campo mantém original; consulta já com karaoke não duplica palavra.

QA-02: sequência `A1,A2,A3,B1,C1,B2` com contadores zero gera `A1,B1,C1,A2,B2,A3`.

QA-03: participante novo ganha prioridade futura sem interromper item reservado ou tocando.

QA-04: duas requisições de adicionar com mesmo commandId geram um item; payload diferente com mesmo ID falha.

QA-05: notas 0 e 10 são aceitas; -1, 11, 8,5, cantor e não membro são recusados.

QA-06: voto aceito antes do deadline entra; voto validado no deadline ou depois não entra, mesmo com timestamp anterior do cliente.

QA-07: todos votam cedo e finalizam uma vez; zero elegíveis produz média nula sem atraso artificial.

QA-08: média arredondada 10,0 sem unanimidade não gera oferta; uma única nota 10 não atinge mínimo proposto.

QA-09: nota perfeita com música existente permite bis; música adicionada depois não é elegível; novo uso da prioridade pelo mesmo participante é recusado antes de quatro apresentações concluídas após seu último bis e liberado com uma nova nota perfeita depois disso; reconexão não reinicia a contagem.

QA-10: evento ENDED duplicado não abre outra votação; evento de palco antigo não altera estado.

QA-11: reinício da API durante votação preserva votos e fecha pelo deadline original.

QA-12: desconexão/reconexão mantém participante; evento antigo não regride versão; duas abas não duplicam voto.

QA-13: vídeo falha depois de começar, cancelamento técnico devolve turno uma única vez; skip voluntário mantém turno.

QA-14: transferência de anfitrião revoga administração anterior; sessão de outra sala não consegue ler/agir no grupo.

QA-15: GIF inválido ou quota esgotada não bloqueia emojis, vídeo, voto ou fila.

QA-16: remoção durante votação invalida voto/eligibilidade de forma atômica; resultado finalizado não muda.

QA-17: encerramento no meio da votação finaliza motivo especial, não concede bônus e revoga ações.

QA-18: falha após commit e antes de broadcast é recuperada pela outbox; duplicata publicada é inofensiva.

QA-19: QR da sala permanece visível e escaneável no lobby, preparação, música, pausa, votação, resultado e recuperação, inclusive com palco expandido e reações ativas. Um novo jogador consegue entrar pelo próprio celular em cada estado com entrada aberta. Nenhum modal ou animação cobre o convite.

## Observabilidade

Logs estruturados com requestId, commandId, roomId técnico, tipo da ação, duração, versão e erro. Métricas: conexões, salas ativas, latência de comando, atraso de outbox, votações vencidas não finalizadas, quota/erros por provedor, reações descartadas e falhas de reprodução.

Alertas iniciais: votação aberta mais de 2 s além do deadline, outbox atrasada por mais de 5 s, aumento de erros de player, erros persistentes de busca e consumo de quota acima de 80% do orçamento observado. Ajustar thresholds com dados do piloto.

## Procedimentos de incidente

| Situação | Resposta operacional |
| --- | --- |
| API reiniciou | Reconciliar estado/deadlines; clientes sincronizam; palco entra em recuperação até confirmação |
| Banco indisponível | Recusar mutações com mensagem de indisponibilidade; nunca confirmar voto/música sem persistir |
| Busca indisponível | Manter fila; suspender novas consultas; mostrar tentativa posterior |
| GIFs indisponíveis | Desabilitar aba temporariamente e manter emojis |
| Palco perdido | RECOVERY; anfitrião reconecta/pareia; invalidar epoch antigo |
| Migração com erro | Interromper rollout; versão anterior compatível; avaliar recuperação antes de qualquer alteração destrutiva |

## Critério de liberação

Checks de tipos, lint, build, testes de domínio/integração e E2E críticos aprovados; ensaio com dispositivos reais; backup restaurado em homologação; credenciais/cotas verificadas; políticas de integração revisadas; nenhum defeito conhecido que possa misturar salas, duplicar apresentação ou aceitar voto vencido.
