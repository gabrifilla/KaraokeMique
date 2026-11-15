# Mascote e copyright

## Decisões adotadas

- Padrão anatômico: **cinco dedos em cada mão**, sendo quatro dedos longos e um polegar. Nos gestos 1, 2 e 3, os demais ficam dobrados.
- Mesmo personagem, materiais e acabamento 3D: cabeça de microfone prateada, corpo roxo, detalhes rosa/ciano, luvas claras e tênis roxos.
- Busto para marca, título e passos: o rosto e a mão ficam legíveis no celular. Corpo inteiro nas boas-vindas e nas reações de resultado.
- Nove PNGs versionados em `apps/web/public/mascot/v3`: `portrait`, `step-1`, `step-2`, `step-3`, `welcome`, `confused`, `encouraging`, `groove` e `celebration`.
- Geração pela ferramenta integrada `image_gen`, com referências do mascote original e do enquadramento enviado pelo usuário. Transparência solicitada na geração, sem recomposição artificial do fundo. Arquivos anteriores preservados.
- As quatro reações agora usam arquivos independentes, sem recortar uma folha de sprites. As animações, frases e regras de notas continuam iguais.
- Marca com mascote e favicon; mascote ao lado do título inicial; gestos substituem os números do resumo de três passos. Tutorial completo continua acessível pelo mesmo botão.
- Rodapé compartilhado com ano corrente, copyright de Karaoke Míque, slogan e créditos de YouTube/GIPHY. Presente nas páginas de jogadores, entrada, tutorial, configuração e erros. Ausente em `/stage/:id`, inclusive quando o palco está carregando ou encerrado. `/stage/pair` e `/stage/tv` são configuração e recebem o rodapé.
- No celular da sala, o rodapé reserva espaço para a navegação fixa, sem cobrir os controles.

## Prompts adotados

Base comum: preservar a identidade do mascote microfone original; acabamento 3D consistente; cada mão com exatamente quatro dedos longos e um polegar; fundo realmente transparente; sem sombra externa retangular, texto ou marca-d'água.

Variações: busto mostrando um, dois e três dedos com os restantes dobrados; busto acenando com cinco dedos; boas-vindas de corpo inteiro com palma aberta; confuso encolhendo os ombros e mostrando as palmas; incentivo com polegar levantado e quatro dedos dobrados; dançando com punhos fechados; comemoração com ambas as mãos abertas. Referência de busto usada apenas para enquadramento, prevalecendo a anatomia de cinco dedos solicitada.

## Validação local

Build, 74 testes das regras e quatro cenários E2E aprovados. Início conferido em 320, 390, 768 e 1366 px, sem rolagem horizontal e com botões padronizados. Tutorial conferido em 320, 390 e 1366 px, incluindo navegação, foco e ajuda. Nove poses inspecionadas visualmente. Presença/ausência do rodapé e imagens válidas verificadas nas rotas públicas e de erro em `mascot-footer-checks.json`.

Nenhuma publicação realizada. O pacote para instalação local deve ser regenerado com `pnpm release` após mudanças nos arquivos públicos.

## Ajuste da marca após revisão

O mascote foi removido de junto da chamada principal da página inicial. A marca e o favicon usam `portrait-relaxed-arm.png`: ambos os braços visíveis, um acenando e outro relaxado junto ao corpo, com cinco dedos por mão. A pose com mão no quadril foi rejeitada por parecer torcida. Originais e variantes permanecem preservados.

Prompt da edição pela ferramenta integrada `image_gen`: alterar apenas o braço à esquerda da imagem, deixando-o descer naturalmente junto ao corpo, cotovelo com curva suave, pulso alinhado e mão relaxada apontando para baixo; quatro dedos longos e um polegar; preservar rosto, braço que acena, materiais, cores, enquadramento de busto e transparência.

### Redesenho a partir do original

Após nova revisão, a marca e o favicon passaram a usar `portrait-original-redraw.png`. Renderização nova pela ferramenta integrada `image_gen`, referenciando apenas o mascote original e o recorte de busto enviado, sem usar as edições intermediárias como referência. Prompt: manter olhos, sorriso, grade prateada diagonal, corpo roxo compacto, botão rosa e faixa rosa/ciano originais; busto com dois braços, mão acenando com cinco dedos, outro braço naturalmente dobrado, cinco dedos também na outra luva; fundo transparente e sem sombra externa. O mascote continua removido da chamada principal. Versões rejeitadas preservadas como histórico.

## Busca de GIFs aberta por padrão

Na tela do jogador, o painel de busca de GIFs inicia expandido. O botão Minimizar GIFs continua disponível; ao recolher, muda para Expandir GIFs, preservando a busca e os resultados. Abrir o painel não dispara requisições ao GIPHY automaticamente. Cenário E2E da sessão atualizado para verificar a busca visível na entrada e o ciclo de minimizar/expandir.
