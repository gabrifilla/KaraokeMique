# Pacote instalável em servidor local — 09/11/2026

O sistema do host ainda não foi identificado pelo usuário. Entrega portável com Docker Compose para Linux ou Windows com Docker Desktop/containers Linux, e alternativa Node 24 + PostgreSQL próprio. Guia completo na raiz: [INSTALAR.md](../INSTALAR.md).

## Mudanças

- `pnpm build`: checagem estrita, bundle Vite, emissão TypeScript NodeNext do backend/contratos/domínio e cópia da migração. Saída `dist/web` + `dist/server`. Nenhum tsx ou Vite no runtime compilado.
- `SERVE_WEB=true` habilita frontend estático pelo próprio Nest/Express, com fallback SPA, 404 para arquivos ausentes/API e bloqueio de dotfiles. Uma origem/porta atende HTML, API e WebSocket. Origem alternativa é redirecionada para `WEB_ORIGIN` na navegação; cache longo somente em assets com hash. HTML sem cache persistente.
- Helmet envia `Referrer-Policy: strict-origin-when-cross-origin`, necessária à identificação do embed YouTube. HSTS não é emitido no HTTP local.
- Produção continua em modo real e valida códigos estritos. `ALLOW_HTTP_LAN=true` permite HTTP somente em localhost/IP privado IPv4 ou hostname sslip.io codificando IP privado. Não libera origem pública nem demo. HTTPS continua sendo o padrão sem opt-in; acesso por internet requer HTTPS. Essa exceção atende a instalação dentro de casa sem exigir certificados nos celulares/TV.
- Docker multi-stage: Node 24, dependências fixadas pelo lockfile, frontend/backend compilados, dependências de produção, usuário não-root. Compose com PostgreSQL 18, volume persistente, healthchecks, reinício, rotação de logs e banco sem porta publicada. Uma instância da aplicação por banco.
- `.env.server.example` não contém segredos. Chave YouTube somente runtime/backend; GIPHY web no build. Instaladores usam `--env-file .env.server` e `config --quiet`, sem imprimir o ambiente completo. Guia cobre endereço, firewall privado, partida, atualização, backups e restauração.
- `pnpm release` faz build com chave GIPHY vazia e copia somente uma lista permitida de código/configuração/build. Não inclui `.env`, `.data`, node_modules, banco, backups, capturas ou arquivos de revisão. ZIP no Windows, tar.gz no Linux, com manifesto SHA-256.

## Validação

`pnpm test:server` cria/remove um banco `karaoke_build_<uuid>` isolado, inicia **JavaScript compilado com NODE_ENV=production**, testa saúde, origem, fallback SPA, assets, 404, Referrer-Policy, sessão, pareamento estrito e snapshot Socket.IO. Evidência em [server-build-check.json](server-build-check.json). Não usa fornecedor de mídia nem dados do banco de desenvolvimento.

Testes de configuração cobrem HTTP privado com opt-in, recusa de público, rejeição de demo em produção e origem inválida. A suíte também cobre as regras anteriores. CI executa o smoke depois de compilar.

Resultado local: **74 testes** aprovados, **4 E2E** aprovados, smoke do servidor compilado aprovado e formatação aprovada. Sintaxe dos instaladores PowerShell e shell conferida sem executá-los contra Docker. ZIP conferido pelo manifesto: arquivos necessários presentes e chaves da máquina de desenvolvimento ausentes. [Evidência do pacote](server-package-check.json).

**Docker não está instalado nesta estação. Não foi possível executar `docker build`/Compose aqui.** A validação do runtime compilado não equivale à da imagem/daemon/rede do servidor. Os instaladores fazem validação Compose e aguardam healthchecks no destino. Nada foi publicado ou instalado remotamente. Também não houve restauração de dump real por esta entrega.
