# 06 — Integrações e viabilidade

> Atualização de implementação (08/11/2026): este documento preserva a especificação inicial. Os padrões foram adotados por autorização do pedido; decisões concretas e desvios estão em [11 — Decisões implementadas](11-decisoes-implementacao.md), e o aceite por etapa em [12 — Validação](12-validacao.md).

**Consulta às fontes oficiais:** 08/11/2026. Cotas, condições e disponibilidade podem mudar; reconfirmar no projeto real antes do piloto público. As seções abaixo distinguem capacidades documentadas de decisões propostas para o produto.

## YouTube: pesquisa

Usar a YouTube Data API no backend. A consulta proposta recebe o texto digitado, normaliza espaços e acrescenta `karaoke` se o termo não existir como palavra. Exemplo: `right through me` → `right through me karaoke`. O campo continua exibindo o original. Tratar a grafia `karoke` como erro comum e acrescentar a palavra correta. A lógica deve respeitar texto em outros idiomas e não remover palavras do usuário.

Parâmetros propostos: `part=snippet`, `type=video`, `q=<consulta>`, `videoEmbeddable=true`, `videoSyndicated=true`, `maxResults=12`, `regionCode=BR` e `relevanceLanguage=pt`. Idioma de relevância não significa restringir músicas a português. O endpoint aceita filtros de incorporação e distribuição; não fornece certificação de que o vídeo seja um karaokê. [Referência search.list](https://developers.google.com/youtube/data/reference/rest/v3/search/list).

Interface proposta: busca por envio explícito, não a cada tecla; próxima página sob demanda. O backend deduplica consultas simultâneas e pode manter cache curto, inicialmente 10 minutos, com chave incluindo consulta, região, idioma e página. Falha do provedor exibe aviso; não simular resultados.

`videos.list` permite obter metadados adicionais. Usar consulta em lote para duração e informações necessárias à validação; não fazer uma requisição por cartão. [Referência videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list).

Validar vídeo na adição e antes de preparar reprodução, observando cache e cota. Proposta: recusar lives ativas, vídeos sem duração conhecida e duração acima de 15 minutos, com mensagem explícita. São restrições de produto sugeridas para evitar sessões presas em vídeos longos, não garantias do YouTube.

### Cotas: dependência de lançamento

A documentação consultada informa buckets próprios para `search.list` e `videos.insert`, com limite padrão de 100 chamadas diárias cada, e 10.000 unidades diárias combinadas para os demais endpoints. Paginação também consome chamadas. Confirmar a quota efetiva no Google Cloud Console e planejar ampliação antes de abrir para muitos grupos. [Calculadora oficial](https://developers.google.com/youtube/data/determine_quota_cost).

Modelo de capacidade proposto: `chamadas de busca = pesquisas submetidas × páginas médias × (1 − taxa de acerto de cache)`. Exemplo ilustrativo: 20 salas × 10 pessoas × 4 pesquisas × 1 página × 70% sem cache = 560 chamadas, acima de um bucket de 100. Os números são cenário de planejamento, não medição.

Ao esgotar a busca: preservar a fila e permitir continuar apresentações existentes; comunicar indisponibilidade temporária. Não criar vários projetos para contornar quota nem trocar a API por scraping.

## YouTube: player e experiência

Usar o IFrame Player API no palco. A API informa estados, incluindo `ENDED`, e erros como vídeo indisponível, incorporação negada e identificação de cliente ausente (`153`); autoplay pode depender das políticas do navegador. [IFrame API](https://developers.google.com/youtube/iframe_api_reference).

Proposta: pedir interação inicial no palco, oferecer “Toque para iniciar” quando necessário e observar `PLAYING` antes de consumir turno. O término relatado alimenta a máquina de estados; duração de metadados não substitui esse evento.

Garantir identificação por Referer e player com dimensões adequadas; a referência exige viewport mínimo de 200 × 200 px e impõe condições de visibilidade para autoplay. [Funcionalidade mínima](https://developers.google.com/youtube/terms/required-minimum-functionality).

### Conteúdo, apresentação e dados

Manter atribuição ao YouTube, preservar informações dos resultados e integridade de reprodução. Não baixar/extrair áudio, bloquear anúncios ou cobrir player/controles com reações. Dados da API armazenados precisam de atualização/remoção dentro dos prazos aplicáveis, incluindo limite de 30 dias para dados não autorizados temporários. [Políticas do YouTube](https://developers.google.com/youtube/terms/developer-policies).

Desenho proposto: título, canal e miniatura do provedor permanecem identificáveis; busca favorecida por consulta, sem inventar selo “karaokê garantido”. Metadados têm `refreshBy` e rotina de limpeza. Reações e placar ficam em áreas próprias do aplicativo.

Ponto a validar antes de uso comercial: adequação da mecânica de pontuação/bis às políticas de integridade de reprodução, pois o YouTube restringe incentivos por assistir vídeos. O desenho pontua a apresentação da pessoa, sem exigir likes, inscrições ou recompensa por visualizações; isso é uma intenção de produto e não uma aprovação do provedor. A integração também não é, por si só, comprovação de autorização para execução musical em eventos públicos/comerciais. Não prometer esse tipo de uso sem avaliação específica.

## GIFs: recomendação inicial

**GIPHY é o candidato inicial**, sujeito à prova de integração e às condições de produção. A decisão técnica é manter uma interface de provedor para não acoplar as regras do jogo a um catálogo. Não misturar catálogos na mesma grade sem validar as condições aplicáveis.

Segundo a documentação consultada: chaves beta têm 100 chamadas por hora; produção depende de solicitação e condições comerciais. O serviço exige atribuição “Powered By GIPHY”, chamadas diretamente do cliente, preservação das URLs e proíbe proxy/cache de respostas e mídia. A busca dispõe de rating; resultados não devem ser reordenados ou filtrados pela integração. [GIPHY API e práticas](https://developers.giphy.com/docs/api/).

Proposta de implementação: seletor de GIFs com busca, paginação e aba de tendências; chave de integração web própria conforme configuração admitida pelo fornecedor. Uma chave exposta no frontend não deve conferir privilégios administrativos nem ser tratada como segredo equivalente à chave de backend do YouTube.

Guardar somente o identificador necessário ao evento efêmero. O receptor resolve mídia pelo ID diretamente no serviço. Não implementar proxy para esconder a chave, cache global de URLs, download/reupload ou otimização de GIFs por um CDN próprio. Confirmar na prova técnica o fluxo completo de compartilhamento por ID e a quota produzida por receptores.

### O que significa “sem limitação”

Intenção preservada: não oferecer só uma seleção fixa de GIFs; permitir pesquisar livremente no catálogo acessível. Isso não garante todo GIF existente na internet nem remove restrições do fornecedor.

Rating padrão deve ser uma decisão de produto: proposta inicial `pg-13`, com ajuste para sala adulta apenas se suportado e compatível com termos. O pedido de liberdade de busca fica registrado; a classificação sugerida não está aprovada. Não prometer conteúdo adulto irrestrito ou envio de URL arbitrária.

Separar liberdade de catálogo de frequência de envio. Proposta técnica: limitar rajadas para preservar a festa, sem limitar o total de GIFs enviados ao longo da sessão. Os números iniciais estão no documento 07. A interface deve comunicar quando houver espera temporária.

Se GIFs falharem, manter emojis e restante do jogo. Não migrar silenciosamente a outro provedor com termos e catálogo diferentes.

## Matriz de risco e validação

| Risco | Impacto | Validação/mitigação proposta |
| --- | --- | --- |
| Resultado não é karaokê | Experiência ruim | Usuário confere título/canal; troca simples de vídeo |
| Bloqueio de incorporação/região | Música não toca | Testar no palco real; substituição e cancelamento técnico |
| Busca acima da quota | Novas músicas indisponíveis | Busca explícita, cache permitido, monitoramento e solicitação de quota |
| Anúncios/autoplay | Espera ou necessidade de interação | Não prometer início imediato; preparar estados visuais e botão local |
| Produção GIPHY não aprovada/onerosa | Reações GIF inviáveis no volume | Confirmar acesso e custo antes do lançamento; emojis mantidos |
| Resolução por ID multiplica chamadas | Quota de GIF acaba rapidamente | Medir fan-out; decidir destino das reações antes do beta |
| Conteúdo inadequado | Desconforto no grupo | Rating revisável, anfitrião pode desligar GIFs e remover participante |
| Uso público/comercial | Dependências adicionais | Avaliar contexto real antes de oferecer esse posicionamento |

## Checklist da prova técnica

- Credenciais válidas em ambiente de homologação, sem incluir segredos no repositório.
- Pesquisa de músicas brasileiras e internacionais, com e sem a palavra karaoke.
- Reprodução real em Chrome/Edge desktop e celulares usados como controle; verificar Safari iOS na jornada de participação.
- Bloqueio de autoplay, vídeo removido, embedding negado, pausas e término real.
- Busca, atribuição, rating, envio por ID e renderização de GIF com URLs preservadas.
- Medição de chamadas de ambos os provedores por sala simulada.
- Registro das condições comerciais, quotas do projeto e restrições confirmadas.

Resultado esperado: relatório com evidências, limitações aceitas e eventuais ajustes de arquitetura. Nenhuma dessas integrações foi executada nesta fase documental.
