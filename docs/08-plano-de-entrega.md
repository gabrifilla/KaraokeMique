# 08 — Plano de entrega e backlog

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

## Abordagem

Entregar uma fatia completa por etapa. Primeiro remover incertezas dos fornecedores, depois validar experiência e regras, e só então ampliar o produto. Não há prazo contratado: duração depende da equipe, disponibilidade de contas, aprovação dos provedores e revisão de produto.

## Etapa 0 — Revisão de produto e prova técnica

Entregas: decisões do documento 09 revisadas; credenciais de teste; relatório de busca/player/GIF; orçamento de quota por cenário; limitações conhecidas.

Aceite: buscar e reproduzir vídeos reais no palco, observar término, simular erros e compartilhar um GIF por ID respeitando a integração. Confirmar viabilidade de produção e custos antes de assumir disponibilidade pública.

Sem viabilidade de GIF, registrar decisão de lançar piloto apenas com emojis ou trocar fornecedor; isso exige revisão de escopo, pois GIFs fazem parte do pedido.

## Etapa 1 — UX e fundação

Entregas: protótipo navegável das telas; componentes/tokens; estrutura do repositório; contratos iniciais; banco e migrações; ambientes e pipeline.

Aceite: revisar jornadas de anfitrião, participante e palco em celular/desktop; representar os estados do documento 03; testes de domínio básicos funcionando; nenhum segredo versionado.

## Etapa 2 — Sala, identidade e palco

Entregas: criar sala, entrar por convite, QR, presença, sessões anônimas, transferência de anfitrião, pareamento e snapshot.

Aceite: um computador e três celulares entram na mesma sala pelo QR; ele permanece visível e escaneável em todos os estados, inclusive palco expandido; outra sala permanece isolada; reconectar não cria nova pessoa; QR não concede administração; trocar palco invalida anterior.

## Etapa 3 — Busca, fila e apresentação

Entregas: integração YouTube, adição/remoção de músicas, fila justa, player, preparação, pausa, skip e falha técnica.

Aceite: exemplo de fila do documento 02 reproduzido com clientes distintos; item reservado não muda com chegada de novo participante; eventos duplicados não criam duas apresentações; vídeo indisponível pode ser substituído.

## Etapa 4 — Votação, resultado e bis

Entregas: elegibilidade, prazo persistido, voto único, cálculo da média, resultado, oferta de bis e histórico.

Aceite: votos concorrentes e no limite do prazo testados; reinício durante votação não perde dados; média sem votos é nula; bônus só vale para item elegível existente e não permite bis infinito na configuração proposta.

## Etapa 5 — Reações e moderação

Entregas: emojis, pesquisa de GIFs, renderização efêmera, controle de fluxo e desligamento pelo anfitrião.

Aceite: reações aparecem fora do player; GIF falho não interrompe a sessão; integração atende atribuição e fluxo do fornecedor; medir consumo por sala e definir em quais dispositivos GIFs são exibidos.

## Etapa 6 — Beta e preparação de produção

Entregas: ensaio de carga, verificação de acessibilidade, testes reais com grupo, métricas, backup/restore, política de retenção e checklist de release.

Aceite: sessão completa com seis ou mais pessoas e interrupções simuladas; metas de qualidade avaliadas; falhas relevantes corrigidas ou explicitamente aceitas; versão implantável e recuperação documentadas.

As sete etapas, numeradas de 0 a 6, são partes do MVP completo. Reduzir o primeiro piloto a uma fatia menor pode acelerar aprendizado, mas não deve ser apresentado como conclusão de todo o escopo.

## Backlog rastreável

| ID | História | Prioridade | Dependências | Aceite resumido |
| --- | --- | --- | --- | --- |
| BK-01 | Como anfitrião, criar e compartilhar uma sala | P0 | Fundação | RF-01/02; QR abre convite correto |
| BK-02 | Como participante, entrar sem instalar app | P0 | BK-01 | Identidade persistida e erro de sala cheia |
| BK-03 | Como anfitrião, parear uma tela de palco | P0 | BK-01 | Escopo de palco separado e revogável |
| BK-04 | Como participante, buscar músicas | P0 | Prova YouTube | RF-03; consulta e quota tratadas |
| BK-05 | Como participante, adicionar/remover minhas músicas | P0 | BK-02/04 | RF-04; idempotência e limites |
| BK-06 | Como grupo, distribuir oportunidades de cantar | P0 | BK-05 | RF-05; QA-02/03 |
| BK-07 | Como anfitrião, iniciar e recuperar apresentação | P0 | BK-03/06 | RF-06; QA-10/13 |
| BK-08 | Como participante, votar de 0 a 10 | P0 | BK-07 | RF-07; QA-05/06/07 |
| BK-09 | Como cantor, receber média e bis por nota 10 | P0 | BK-08 | RF-08/09; QA-08/09 |
| BK-10 | Como participante, reagir com emojis/GIFs | P0 do escopo completo | BK-07 e prova GIF | RF-10; QA-15 |
| BK-11 | Como membro, retomar após desconexão | P0 | Sessões e snapshot | RF-11; QA-11/12 |
| BK-12 | Como anfitrião, moderar e transferir comando | P0 operacional | BK-02 | RF-12/13; QA-14/16 |
| BK-13 | Como grupo, consultar resumo | P1 | BK-08 | RF-14; resultados finais consistentes |
| BK-14 | Como operador, observar e recuperar o serviço | P0 para beta | Infraestrutura | Logs, alertas, restore e retenção |

P0 significa necessário para a entrega correspondente; P1 pode ser simplificado no piloto, preservando dados para evolução.

## Definição de pronto por funcionalidade

Regra documentada e refletida no domínio; layout de celular/palco quando aplicável; estados de carregamento/erro/reconexão; contrato validado; autorização por sala; testes proporcionais ao risco; métricas de erro necessárias; documentação atualizada; revisão no ambiente de homologação.

Não adicionar testes triviais de estilo para cumprir quantidade. Concentrar esforço nas regras de fila, tempo, concorrência, identidade e recuperação.

## Dependências externas

Projeto Google Cloud e quota, credencial/condições do catálogo de GIFs, domínio/HTTPS, hospedagem com WebSocket, banco/backups e dispositivos reais para o piloto. Uma dependência pendente deve aparecer no acompanhamento de entrega, sem ser substituída por uma integração simulada apresentada como pronta.

## Próxima ação recomendada

Revisar as escolhas de produto do documento 09 e executar a Etapa 0. Com a viabilidade registrada, desenhar as telas com segurança de que a experiência cabe nas capacidades das integrações.
