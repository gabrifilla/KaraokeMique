# Operação e preparação de homologação

## Execução e recuperação

Uma instância de API e um worker no mesmo processo. `/api/v1/health` verifica banco e informa o modo. O banco recusa confirmação falsa: mutação só recebe ACK após commit. Logs de falha são JSON sem corpo, token, apelido ou consulta. Vite é ferramenta de desenvolvimento; não serve como configuração pública final.

O worker reconcilia deadline persistido, bônus e perda de palco a cada 100ms. Outbox persiste até publicação; o cliente recebe snapshot com versão, descarta regressão e sincroniza também no heartbeat. Publicação não significa confirmação de exibição em cada navegador. Reações são efêmeras e não têm replay.

| Falha | Procedimento |
| --- | --- |
| API reiniciada | Clientes reconectam e recuperam identidade por cookie; deadline original é respeitado. Palco em andamento entra RECOVERY e exige retomada do anfitrião |
| Banco indisponível | Restaurar conexão; não registrar votos/músicas manualmente; recusar ações até persistir |
| Palco perdido | Após 15s, RECOVERY; reconectar/parear, retomar ou cancelar tecnicamente |
| Vídeo indisponível | Verificar autoplay/Referer/embedding, cancelar tecnicamente e adicionar outro vídeo |
| Quota de busca | Preservar fila e resultados; conferir orçamento/cotas na conta real; não usar scraping |
| GIF indisponível | Manter emojis; conferir chave/cota; reação vencida não é repetida |
| Cookie perdido | Identidade anônima depende do navegador; moderar registro anterior e reentrar se necessário |

### YouTube na rede local

Em 08/11/2026, o vídeo real `yuRT7VXRMBI` reproduziu em localhost, mas retornou erro 150 ao usar `http://192.168.0.122:5176`, com Referer presente. O mesmo vídeo reproduziu usando `http://karaoke.192.168.0.122.sslip.io:5176`. Um vídeo de documentação do YouTube reproduziu também no IP; portanto, não é uma falha universal de toda reprodução por IP, nem prova de remoção dos vídeos do catálogo.

O launcher `scripts/start-lan.ps1` passa a usar hostname para os ensaios na rede. O DNS sslip.io aponta para o IP local, sem encaminhar o tráfego da aplicação. Não há proxy de mídia, falsificação de Referer nem alteração da identidade do embed: o player continua usando a origem real do navegador. Vite permite explicitamente o hostname de `WEB_ORIGIN`, envia `Referrer-Policy: strict-origin-when-cross-origin` e redireciona navegações HTML alternativas para a origem configurada. Reiniciar em outro hostname exige uma nova sala de teste/pareamento devido ao isolamento dos cookies por host.

O player mostra o código original e distingue vídeo removido/privado (100), parâmetros inválidos (2), falha de reprodução do navegador (5), recusa de incorporação (101/150) e identificação de cliente ausente (153), conforme a [referência oficial do IFrame API](https://developers.google.com/youtube/iframe_api_reference#onError). Em IP, 101/150 sugere usar o hostname configurado. Um erro cancela o timer de prontidão, evitando substituir o diagnóstico por um timeout posterior.

Para repetir a prova completa contra uma origem específica: defina `SPIKE_ORIGIN` e execute `pnpm exec tsx scripts/real-spike.ts`. Sem essa variável, a prova mantém `http://localhost:5175`. O relatório registra a origem efetivamente usada.

## Retenção

Sala sem atividade por 2h é encerrada; sala encerrada é removida após 24h, com cascade de sessões, recibos, outbox e pareamentos. Sessão renova validade em heartbeat; pareamento vale 2min. Reações não são persistidas. Dados locais de testes/capturas permanecem no disco até limpeza deliberada.

Metadados YouTube são consultados na adição e preparação. Antes de produção, definir expiração adicional para sala excepcionalmente ativa por mais de 30 dias, revisar políticas e estabelecer retenção de logs/backups. Esta entrega não declara conformidade legal ou aprovação dos provedores.

## Backup/restore em homologação

Use clientes oficiais PostgreSQL compatíveis e credenciais por ambiente ou `.pgpass`, sem segredos em scripts. Com `PGHOST`, `PGPORT`, `PGUSER` e `PGDATABASE` definidos:

```sh
pg_dump --format=custom --file=karaoke-backup.dump
createdb karaoke_restore_check
pg_restore --no-owner --dbname=karaoke_restore_check karaoke-backup.dump
```

Compare contagens e dados; inicie API isolada na base restaurada e valide encerramento de votos vencidos, sessões e isolamento. Meça o tempo real antes de adotar RPO/RTO. Restrinja acesso ao dump: ele contém identidades e hashes de sessão. Expiração deve incluir backups.

**Restore de dump ainda não foi executado.** A ferramenta embedded local não fornece `pg_dump`/`pg_restore`; use cliente oficial ou container. O teste automatizado de nova instância do repositório e prazo persistido verifica outra camada de recuperação e não substitui desastre.

## Liberação futura

Antes de publicar: credenciais/contratos/quotas, marca gráfica e analytics GIPHY, contexto de uso do YouTube, piloto físico com seis pessoas, Safari, QR a distância, autoplay e áudio. Medir carga sustentada e p95 de comandos/propagação. Configurar HTTPS, cookie Secure, domínio único, proxy `/api`/`socket.io`, fallback SPA, referrer e CSP compatíveis, segredos no ambiente, backups e alertas. Rate limits/presença são locais: múltiplas instâncias precisam de coordenação e adapter próprios.
