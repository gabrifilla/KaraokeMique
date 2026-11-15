# Cooldown do bis: quatro músicas — 09/11/2026

Decisão refinada pelo usuário: o limite permanente por sala foi substituído por **quatro apresentações concluídas depois do último bis**. Depois dessa espera, a pessoa pode ganhar outra prioridade se obtiver uma nova nota perfeita elegível.

- Primeiro bis continua exigindo unanimidade exata em 10 com ao menos dois votos e uma música elegível já pendente no fechamento da rodada.
- A prioridade é consumida quando a música do bis é selecionada/preparada, não no simples aceite da oferta. Oferta recusada, expirada ou cancelada antes de selecionar o bis não consome o direito.
- O próprio bis não conta. As quatro músicas posteriores podem ser de qualquer participante, incluindo apresentações normais do próprio cantor. A quarta conta quando concluída: uma nota perfeita nessa apresentação já pode gerar oferta. Sem votos também conta como apresentação concluída.
- Notas perfeitas durante o cooldown não acumulam créditos; após a espera é necessária uma nova nota perfeita. Um bis nunca gera outro bis diretamente. Cada novo bis reinicia a espera.
- Músicas puladas/canceladas/com falha não encurtam a espera. Pular/cancelar o bis após sua seleção também não devolve a prioridade. A devolução de turno em cancelamento técnico continua funcionando normalmente.
- A contagem é individual, persistida pelo histórico e resiste a recarregamento, reconexão e reinício da API. Os demais participantes mantêm seus próprios direitos e cooldowns. As músicas do cantor continuam seguindo a fila justa enquanto ele aguarda.
- Nova sala começa novo histórico e novo direito. A identidade é a sessão anônima do participante, como no restante do produto.

O servidor encontra o último `isEncore` do cantor no histórico/apresentação atual e conta as apresentações `COMPLETED` posteriores. Isso funciona em salas existentes, sem novo campo ou migração. A proteção cobre oferta, aceite, previsão de fila e preparação. Ofertas antigas incompatíveis com o cooldown são canceladas pela manutenção.

Testes cobrem a fronteira de três/quatro músicas, novo bis reiniciando a contagem, nota 10 no próprio bis, reconexão, comando direto durante espera, independência entre cantores e exclusão de pulo/falha. Regras de nota/média, fila e resultado mínimo permanecem.

Validação: **57 testes de regras/adaptador/banco**, **4 cenários E2E**, build e formatação aprovados. Sem publicação ou migração.
