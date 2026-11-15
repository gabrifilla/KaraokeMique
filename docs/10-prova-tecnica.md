# Prova técnica — 08/11/2026

Executada antes da implementação da aplicação: `pnpm spike`. Evidência inicial bruta, sem URLs com chaves: [spike-initial-result.json](spike-initial-result.json). A configuração local mudou durante o desenvolvimento; a revalidação atual está em [spike-result.json](spike-result.json).

| Integração | Resultado observado | Conclusão |
| --- | --- | --- |
| YouTube Data API, consulta com karaoke | HTTP 403; chave ausente | Endpoint alcançável; pesquisa real bloqueada por configuração |
| Script YouTube IFrame | HTTP 200 | SDK alcançável; não comprova autoplay, áudio, término ou incorporação no navegador |
| GIPHY search | HTTP 401; chave ausente | Endpoint alcançável; busca e compartilhamento por ID pendentes |
| PostgreSQL | Binário local isolado, conexão e transações reais | Viável para desenvolvimento sem instalar serviço global |

Fontes primárias consultadas nesta execução: [search.list](https://developers.google.com/youtube/data/reference/rest/v3/search/list), [IFrame API](https://developers.google.com/youtube/iframe_api_reference), [GIPHY API](https://developers.giphy.com/docs/api/), [endpoints GIPHY](https://developers.giphy.com/docs/api/endpoint/).

## Decisão para continuar

Stack recomendada mantida. Adaptadores reais implementados, com erro explícito na falta de configuração. `INTEGRATION_MODE=demo` seleciona deliberadamente três músicas fictícias e um player com eventos manuais: não usa vídeo/áudio do YouTube. A interface mostra faixa de demonstração. Não existe fallback silencioso do modo real para demo. GIPHY não possui catálogo fictício; sem chave, a busca exibe indisponibilidade e emojis continuam funcionando.

## Dependências e roteiro de aceite real

1. Habilitar YouTube Data API v3 em projeto Google Cloud e fornecer `YOUTUBE_API_KEY`, restrita ao backend/API. Confirmar buckets/cotas efetivos no Console. Não colocar a chave no frontend.
2. Criar aplicação GIPHY, configurar chave web em `VITE_GIPHY_API_KEY` e solicitar aprovação/condições de produção. Essa chave vai para o bundle por desenho do fornecedor; não concede administração da sala. Confirmar atribuição gráfica e analytics exigidos antes de lançar.
3. Com `INTEGRATION_MODE=real`, executar `pnpm spike`, pesquisar músicas BR/internacionais, conferir metadados e tocar no palco desktop com áudio. Observar início, pausa, término, bloqueio de autoplay e erros de incorporação/153.
4. Buscar GIF, enviar somente ID, confirmar resolução direta no palco e URLs intactas. Testar quota e indisponibilidade. Cada busca/página custa uma chamada; cada GIF entregue ao palco custa uma resolução por ID. Celulares não resolvem GIF recebido.
5. Medir chamadas, custo e condições nas contas reais. Cenário ilustrativo do documento 06: 560 buscas para 20 salas pode exceder o bucket padrão documentado de 100 chamadas/dia. Não constitui capacidade contratada.

HTTP 200 do script e eventos simulados **não** encerram o aceite da etapa 0. Busca/player/GIF reais, condições comerciais e reprodução em aparelhos do piloto continuam pendentes. A continuidade das etapas independentes foi autorizada no pedido de implementação.

## Revalidação com configuração local

Ao fim do desenvolvimento, havia chaves preenchidas no `.env` local, que permanece ignorado e não é copiado para documentação. A nova execução recebeu HTTP 200 dos dois fornecedores. A prova integrada `scripts/real-spike.ts`, contra API/web reais nas portas 3003/5175, verificou:

- Pesquisa YouTube pela aplicação: 12 vídeos com metadados válidos, sem simulação.
- Início do player real: PLAYING confirmado pelo IFrame e persistido no servidor.
- Busca GIPHY diretamente no browser: 12 resultados, HTTP 200.
- Envio de GIF por ID, resolução direta no palco, HTTP 200 e imagem efetivamente carregada em `media0.giphy.com`.
- ENDED real emitido pelo IFrame após seek técnico para os segundos finais; com apenas cantor presente, resultado imediato sem votos.

[Relatório integrado](real-spike-result.json) e [captura do palco real](screenshots/real-stage.png). Não houve reprodução de uma música inteira, verificação de áudio físico ou validação comercial. O seek foi feito pelo harness da prova, não por controles adicionados ao produto. A versão continua precisando de piloto em aparelhos e revisão das condições/quotas de produção. A pendência inicial de credenciais foi resolvida no ambiente local.
