# Tutorial de uso — 09/11/2026

Na tela inicial, abaixo dos três passos de **Como funciona**, a chamada **Ainda não conseguiu?** oferece o botão **Ver tutorial completo**. A rota pública `/tutorial` não exige criar sala nem faz chamadas aos fornecedores.

O guia tem dez etapas: preparar aparelhos, criar sala, conectar TV, entrar como jogador, escolher músicas, acompanhar a fila, votar/entender o bis, enviar reações, usar os controles do anfitrião e recuperar/encerrar a sessão. Distingue QR de conexão da TV do QR de entrada dos jogadores e códigos de seis dígitos/oito caracteres. Usa os nomes reais dos controles e o cooldown atual de quatro músicas após o bis.

O tutorial orienta apenas abrir o endereço do Karaoke Míque em cada aparelho, sem explicar redes locais, publicação ou dados móveis. Detalhes de instalação e acesso ficam no guia técnico, fora do passo a passo de uso.

Há índice por âncoras, ajuda rápida expansível, links para criar/entrar e retorno ao início. Ao abrir a página, o foco vai ao título e a leitura começa pelo topo; respeita movimento reduzido. Instruções são texto/HTML reais, sem mock de ações ou alterações de regras. Layout segue a identidade aprovada, com coluna de índice no desktop e lista sequencial no celular.

Verificado em 320, 390 e 1366px: botão no local solicitado, dez etapas, navegação por âncora, ajuda expansível, link de criação, foco inicial e ausência de transbordamento/erros JavaScript. Evidência em [tutorial-checks.json](tutorial-checks.json); capturas em `docs/screenshots/tutorial-*.png`. Build compilado e formatação verificados. O pacote de instalação é regenerado para incluir o guia.
