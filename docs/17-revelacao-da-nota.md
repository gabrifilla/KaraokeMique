# Revelação da nota e reações do mascote

Solicitação de 08/11/2026. A apresentação do resultado agora contém **{nome} cantou {música}**, nota, frase e mascote. A quantidade de votos foi retirada desse card; regras e dados de votação permanecem iguais.

## Suspense sem alterar a nota

A média é revelada em 2,6 segundos, com contagem crescente e desaceleração no final. Os valores intermediários nunca ultrapassam a média; a última exibição usa a média real, formatada com uma casa decimal. A animação não modifica pontuação, unanimidade, bônus ou turno.

Sem votos não existe nota zero inventada: após uma pausa de 0,9 segundo, aparece **Sem notas**. O mascote confuso e uma frase acolhedora substituem a nota. Nota zero real recebe incentivo, não é tratada como ausência de votos.

Os tempos são relativos ao fechamento da votação no servidor, cabendo dentro dos cinco segundos mínimos de resultado existentes. Entrar/recarregar durante a revelação mostra apenas o trecho restante; um resultado antigo e o histórico são exibidos diretamente, sem repetir suspense/som. A próxima música continua respeitando resultado e decisão de bis. A frase é escolhida de forma estável pelo ID da apresentação, igual em todos os dispositivos.

## Frases e mascote

Cada uma das cinco faixas possui **sete frases diferentes**, totalizando 35 mensagens: sem notas, incentivo, dançando, comemoração e nota dez. A seleção continua estável por apresentação, para que palco e celulares exibam a mesma frase e ela não mude ao atualizar a tela.

| Resultado | Reação | Exemplo de frase |
| --- | --- | --- |
| Sem notas | Confuso, de mãos para cima | “Ué, cadê os jurados? Ninguém votou, mas seu show merece aplausos!” |
| Abaixo de 6 | Sorriso e incentivo | “A nota foi tímida. Sua coragem, nem um pouco. Bora pra próxima!” |
| De 6 até abaixo de 8,5 | Dançando | “O chuveiro perdeu seu maior talento. Hoje o palco é seu!” |
| De 8,5 até abaixo de 10 | Comemoração | “Alguém avisa a gravadora que o show já começou!” |
| Exatamente 10 | Comemoração e frase especial | “Nota dez! Até o meu cabo arrepiou. Que espetáculo!” |

O [asset atual](../assets/mascot/mascote-reacoes-v2.png) mantém a identidade do mascote original em quatro poses. Foi editado com `image_gen` integrado; [prompt das expressões](../assets/mascot/PROMPT-REACOES.md) e [prompt da limpeza de transparência](../assets/mascot/PROMPT-TRANSPARENCIA.md). O original permanece preservado. Corpo inteiro, transparência e pose são selecionados por quadrante de uma folha 2×2, com movimento leve em CSS.

A versão 2 remove o halo/sombra externa que evidenciava os limites quadrados dos sprites. Tem margem transparente entre as poses e usa uma URL nova para evitar cache da versão anterior. As quatro expressões foram verificadas sobre os fundos reais dos resultados: [prévia da transparência corrigida](screenshots/mascot-transparency-v2.png). Build e formatação aprovados após a substituição.

## Som e acessibilidade

O efeito é original, sintetizado em Web Audio: notas curtas com ritmo crescente durante a contagem, seguidas por um acorde acolhedor na revelação. Sem notas recebe dois tons suaves de pergunta, sem efeito de derrota. Há um barramento próprio com ganho de −18 dB e envelopes curtos para evitar estalos; nenhum áudio remoto, download, credencial ou pacote de som é necessário.

Som apenas no palco, nunca em todos os celulares. A opção **Silenciar som das notas** persiste localmente; **Ativar som das notas** permite liberar áudio quando o navegador exige interação. O efeito não altera volume/mute do YouTube. A interface nunca espera permissão de som para revelar o resultado. A política de áudio segue o navegador, conforme a [documentação de autoplay do Chrome](https://developer.chrome.com/blog/autoplay/) e o [`AudioContext.resume()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume).

Com `prefers-reduced-motion`, a nota e a frase aparecem diretamente e o balanço do mascote é desligado. Leitores de tela recebem uma mensagem de suspense e depois o resultado final, sem ler cada incremento do contador. O histórico não anima nem toca som.

## Validação

Testes cobrem progressão limitada à média, valor final exato, diferença entre nota zero e ausência de nota, frase estável e faixas de reação. E2E verifica suspense → resultado final, mascote de comemoração, frase/identificação sem quantidade de votos, ausência de áudio nos celulares, criação dos osciladores de áudio no palco e controle de silêncio. Outro cenário cobre ausência de votos, mascote confuso, movimento reduzido e recarga de resultado sem repetição.

Prévias: [nota dez no palco](screenshots/stage-1080p.png), [sem notas no palco](screenshots/result-no-votes.png), [sem notas no celular](screenshots/result-mobile-no-votes.png). As capturas usam player de demonstração identificado. O áudio usa Web Audio real no teste; escuta e volume no aparelho/TV físico continuam sujeitos ao ensaio local.

Validação final: 42 testes automatizados e 4 cenários E2E aprovados; build e formatação aprovados. Também foram conferidos enquadramento do número/mascote no celular e resultado completo no palco 720p/1080p. As mudanças estão disponíveis no servidor de revisão local, sem publicação.
