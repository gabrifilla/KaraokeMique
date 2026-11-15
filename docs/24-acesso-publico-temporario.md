# Acesso público temporário pela própria máquina

O acesso usa Cloudflare Quick Tunnel com HTTPS. Foi autorizado para teste externo pelo usuário. Não há redirecionamento de portas no roteador, nem exposição do PostgreSQL. O endereço muda quando o túnel é recriado. Não é um serviço permanente com garantia de disponibilidade.

## Execução preparada nesta máquina Windows

- Ferramenta oficial `cloudflared` 2026.10.7 em `.data/tools/cloudflared.exe`, baixada do release oficial e conferida por SHA-256 informado no GitHub.
- Aplicação compilada, sem servidor Vite, em `127.0.0.1:5180`.
- `NODE_ENV=production`, `INTEGRATION_MODE=real`, `SERVE_WEB=true`, `ALLOW_HTTP_LAN=false`, `WEB_ORIGIN` igual ao HTTPS temporário.
- `TRUST_PROXY=loopback`: o `cloudflared` conecta pelo 127.0.0.1 e informa o IP real em `X-Forwarded-For`. Sem isso, todos os celulares dividiriam o mesmo limite de requisições (por exemplo, 5 salas criadas por hora para a festa inteira).
- Banco separado `karaoke_public` no PostgreSQL local existente. O ambiente de desenvolvimento e suas salas não foram alterados.
- Chaves existentes são lidas de `.env` sem serem copiadas para a documentação. GIPHY integra o frontend por desenho; YouTube fica no backend. Integrações reais, sem simulações.
- Supervisor inicia a aplicação após descobrir o endereço do túnel. QR codes e sessões usam esse mesmo endereço. Pareamento livre de desenvolvimento desativado.
- Estado/endereço/PIDs, sem credenciais: `.data/public-tunnel.json`. Logs em `.data/public-*.log`.

## Parar

Na pasta do projeto, em PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-public-tunnel.ps1
```

O comando verifica os processos registrados antes de encerrá-los. Preserva o banco e os servidores de desenvolvimento.

## Iniciar novamente

Confirme que o PostgreSQL local está ativo (`pnpm db:local` em outro terminal se necessário). Encerre a execução pública anterior antes de reconstruir ou iniciar outra:

```powershell
pnpm build
node scripts/public-tunnel.mjs
```

O terminal informa o novo endereço público. Mantenha-o aberto; Ctrl+C encerra aplicação e túnel. A execução inicial preparada pelo assistente está em segundo plano, sem janela. Não foi configurada inicialização automática com o Windows.

Compartilhe apenas o endereço HTTPS informado. A máquina precisa continuar ligada, conectada e sem suspensão. Novos túneis geram outros hostnames; entre novamente nas salas e reconecte a TV pelo novo endereço. Dados do banco persistem, mas cookies são próprios de cada hostname.

## Validação

`public-tunnel-check.json` registra teste no endereço público: criação/entrada em sala, autorização de TV em produção, QR visível, emojis em tempo real via Socket.IO, cookies seguros, GIFs inicialmente expandidos, palco sem footer e bloqueio de arquivos privados. A sala de teste foi encerrada. Teste físico com dados móveis, reprodução no aparelho e restrições específicas das chaves dos provedores ainda precisam ser conferidos no uso real.

Fontes: [Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [Downloads oficiais](https://developers.cloudflare.com/tunnel/downloads/).
