# Decisões adotadas — implementação 0.1

As propostas dos documentos 02 e 09 foram adotadas como padrões iniciais revisáveis por autorização do pedido de desenvolvimento de 08/11/2026. Os documentos originais preservam o contexto da proposta; este registro prevalece para descrever o código entregue.

| Decisão | Implementação e motivo |
| --- | --- |
| Stack | React, TypeScript, Vite, Router, TanStack Query, Tailwind, Radix AlertDialog; NestJS, Socket.IO; PostgreSQL, Drizzle e Zod. Node 24; pnpm 11.5; lockfile versionável |
| Regras DP-02 a DP-11, 14 a 17 | Sessão anônima, notas inteiras, sem autovoto, unanimidade exata com ≥2 votos, bis para item existente com cooldown individual de quatro apresentações concluídas após o bis, fila por turnos simulados, devolução técnica, resultado mínimo 5s, 30 pessoas, 5 músicas/pessoa, 100 pendentes, vídeos até 15 min, resumo 24h |
| Persistência de sala | Agregado JSONB tipado em uma linha por sala. Lock `FOR UPDATE` serializa toda a transição. Evita atualização parcial entre fila, votos e bônus. Sessões, recibos, pareamentos e outbox são tabelas relacionais |
| Desvio do modelo lógico 05 | Participantes/votos/apresentações não são tabelas individuais nesta versão. As invariantes ficam no domínio e na fronteira transacional, com testes concorrentes reais. SQL não impõe CHECK por voto interno; acesso de escrita ao banco é exclusivo da API. Normalizar antes de relatórios transversais/escala que justifiquem a complexidade |
| API | Prefixo `/api/v1`; mutações de domínio concentradas em `/rooms/:id/commands` com schema compartilhado. Não duplicar handler por transporte. HTTP responde ACK; Socket.IO publica snapshots completos |
| Segurança | Cookie HttpOnly separado por sala e papel; só hash no banco. SameSite Lax, Secure quando HTTPS, Origin estrito e token CSRF. QR contém somente convite público. Nenhuma chave administrativa em URL |
| Pareamento | Anfitrião autoriza previamente um código de 96 bits por 2min e entrega à tela confiável, que o consome uma vez. Simplificação do fluxo de solicitação/aprovação do documento 05. Não basta conhecer o convite público. Substituição incrementa epoch e revoga sessão anterior |
| Presença | Heartbeat a cada 5s; fila tolera 2h de ausência (celular bloqueado não tira ninguém da fila), palco 15s; votação considera atividade recente (<15s) e sockets conectados no instante de abertura. Presença não é autenticação |
| Recuperação | Identidade em cookie; snapshot versionado em handshake, evento e heartbeat; recibos persistidos por sessão/commandId; outbox até publicação. Voto expirado jamais reenviado offline |
| GIFs | GIPHY direto do browser, pg-13, sem proxy/cache; resolução por ID somente no palco; falha omite reação. Texto de atribuição presente; revisão gráfica/analytics do fornecedor pendente de homologação de produção |
| Mascote | Original preservado; cópia em `apps/web/public/mascot.png`, sem transformações destrutivas |
| Banco de desenvolvimento | `embedded-postgres` somente como ferramenta local. Executa PostgreSQL real, não banco simulado. Binários de desenvolvimento não fazem parte do servidor de produção. Banco criado explicitamente UTF-8 para suportar emojis no Windows |
| Escala | Uma instância de API; presença/rate limits locais. Não anunciar suporte a múltiplas instâncias sem adapter e coordenação distribuída |

Não houve publicação, contratação, criação de conta ou provisionamento externo. O usuário definiu o nome **Karaoke Míque** e o slogan **“Solta a voz, pede Bis”**. A [revisão do palco](15-palco-e-identidade.md) registra a composição atual de player maior, QR compacto, fila lateral, emojis em overlay e GIF na direita.
