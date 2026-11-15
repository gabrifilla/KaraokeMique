# Ideias para cantar na busca — 09/11/2026

Ao abrir Buscar, a lista já mostra sugestões de um tema. A cada nova entrada na aba, volta à seleção de ideias e pede o próximo tema da rotação. **Outras ideias** troca sem sair da tela; **Ver sugestões** sai da busca manual e pede novas ideias. Texto de carregamento, estado vazio, indisponibilidade e tentativa novamente são explícitos. Uma resposta tardia de sugestões não substitui os resultados de uma busca manual, pois os dados são independentes.

## Origem e limites

São resultados reais das 16 buscas abaixo, sempre acrescentando `karaoke` internamente, com relevância do YouTube e filtros existentes de incorporação/distribuição para o Brasil. A preferência de idioma português não impede vídeos de músicas internacionais. Metadados em lote descartam lives, duração inválida/acima de 15 minutos e bloqueios regionais conhecidos. Adição e preparação revalidam o vídeo. A API não garante que seja karaokê apenas pelo título/consulta.

| Tema | Busca antes de acrescentar karaoke |
| --- | --- |
| Pop internacional · anos 2000 | 2000s pop hits |
| Rock nacional | rock nacional |
| Pop brasileiro · anos 2000 | pop brasileiro anos 2000 |
| Emo · anos 2000 | emo rock anos 2000 |
| Pop punk | pop punk |
| Rock clássico | classic rock |
| Pop · anos 90 | 90s pop hits |
| Grunge | grunge rock |
| Indie rock | indie rock |
| New wave · anos 80 | new wave anos 80 |
| Heavy metal | heavy metal |
| R&B e soul | r&b soul |
| Disco e dance · anos 80 | disco dance anos 80 |
| MPB | mpb clássicos |
| Disney e trilhas sonoras | Disney trilhas sonoras |
| Rock alternativo · anos 90 | alternative rock anos 90 |

Não são recomendações personalizadas nem usam histórico/conta de YouTube dos jogadores. A antiga opção `relatedToVideoId` foi removida em 2023; esta implementação usa a [busca oficial](https://developers.google.com/youtube/data/reference/rest/v3/search/list), sem scraping. [Histórico oficial da remoção](https://developers.google.com/youtube/data/revision_history#august-7,-2023).

## Implementação

- `GET /api/v1/rooms/:id/music/suggestions`, autenticado como participante, rate limit próprio de 12 requisições por minuto por jogador. Não consome o limite de seis pesquisas manuais.
- Até 12 vídeos, sem paginação automática. Mesmo fluxo de adicionar à fila, sem alterar regras de turnos, votos ou bis.
- Cache compartilhado em memória por **24 horas por tema**, com uma consulta em voo por tema para chamadas simultâneas. A rotação circular é compartilhada no servidor e avança mesmo quando usa cache. Depois dos 16 temas, recomeça; outros jogadores também avançam essa sequência. Em uso contínuo e sem reinícios/falhas/vazios, o conjunto exige no máximo uma busca por tema por janela de cache, reservando cota para pesquisas manuais. Cache vazio por dez minutos; falha por um minuto para impedir repetição durante indisponibilidade. Reiniciar API invalida cache e reinicia rotação. Uma instância, como o restante da aplicação.
- O frontend pede o próximo tema ao entrar em Buscar ou tocar Outras ideias, sem refazer por foco da janela. A variedade vem da rotação; a economia de cota fica no cache servidor. Sugestões não sobrescrevem buscas manuais. Falhas não criam resultados artificiais nem desabilitam o formulário.
- Modo demo retorna o catálogo fictício já existente, claramente identificado. Modo real exige a mesma `YOUTUBE_API_KEY`, sem credenciais novas, OAuth ou contratação.

## Verificação

Testes do adaptador cobrem consulta real simulada, filtros, concorrência, TTL e cooldown; demo não acessa fornecedor. E2E cobre lista inicial sem digitar, adição de uma sugestão, busca manual, retorno à lista e falha não bloqueante. Acesso sem sessão é recusado.

Consulta real confirmou **HTTP 200 e 12 vídeos** em duas listas, alternando de pop internacional para rock nacional: evidência sem segredos em [suggestions-real-check.json](suggestions-real-check.json) e [captura real](screenshots/search-suggestions-real.png). A sala criada somente para essa verificação foi encerrada. Os termos pop internacional/anos 90 usam inglês para reduzir a concentração em resultados brasileiros; gênero e qualidade do karaokê dependem da relevância do YouTube, não de uma classificação própria. Nenhuma contratação/publicação.

Validação final: **47 testes de regras/adaptador/banco** e **4 cenários E2E**, build e formatação aprovados. Rotação de todos os 16 temas antes de repetir, cache/coalescência por tema, cooldown global e ausência de resultados artificiais cobertos. E2E reutiliza uma sala para respeitar o rate limit real de criação por IP.
