export const SCORE_REVEAL_MS = 2600;
export const NO_SCORE_REVEAL_MS = 900;
export type ScoreMood = "confused" | "encouraging" | "groove" | "celebration";
const lines = {
  confused: [
    "Ué, cadê os jurados? Ninguém votou, mas seu show merece aplausos!",
    "A plateia esqueceu o botão. Eu não esqueci do seu show!",
    "Sem notas? Vou mandar um abraço no lugar. Bora cantar mais uma!",
    "A galera cantou junto e esqueceu de votar. Isso também é sucesso!",
    "Os jurados foram buscar um salgadinho. Seu talento continua aqui!",
    "Não veio nota, mas veio história boa pra contar. Valeu o show!",
    "Meu botão de aplausos tá funcionando. Palmas pra quem soltou a voz!",
  ],
  encouraging: [
    "A nota foi tímida. Sua coragem, nem um pouco. Bora pra próxima!",
    "O palco já é seu. A próxima pode ser o seu maior hit!",
    "Quem solta a voz já ganha meu respeito. Mais uma?",
    "Esse foi o aquecimento. O próximo refrão já tá torcendo por você!",
    "A nota cabe na tela. A sua coragem merece um palco inteiro!",
    "Todo grande show começa com alguém dizendo: vou tentar. Você foi lá!",
    "O importante é sair do sofá e entrar no refrão. Missão cumprida!",
  ],
  groove: [
    "O chuveiro perdeu seu maior talento. Hoje o palco é seu!",
    "Já dá pra trocar o shampoo pelo microfone. Mandou bem!",
    "Tem ritmo, tem coragem e tem plateia querendo mais!",
    "O controle remoto virou microfone de reserva. A festa pegou!",
    "Se cantar assim no banho, a conta de água vai virar ingresso!",
    "Já tem fã na sala. Pode começar a ensaiar o autógrafo!",
    "Essa entrou pra playlist dos bons momentos. Mandou bem demais!",
  ],
  celebration: [
    "Alguém avisa a gravadora que o show já começou!",
    "Essa voz merece palco, luz e mais uma rodada de aplausos!",
    "O microfone tá se achando depois desse show!",
    "Eu vim trabalhar de microfone e acabei virando fã!",
    "O refrão terminou, mas o arrepio pediu pra ficar!",
    "Segura essa voz, que a sala ficou pequena pro tamanho do show!",
    "Se isso foi só uma palhinha, imagina a turnê!",
  ],
  perfect: [
    "DEZ! O vizinho já está pedindo ingresso pro próximo show!",
    "Nota dez! Até o meu cabo arrepiou. Que espetáculo!",
    "Pode preparar o camarim. Nasceu uma estrela nessa sala!",
    "DEZ redondinho! Essa voz acabou de ganhar um lugar no meu coração!",
    "Nota máxima! A sala virou estádio e eu tô na primeira fila!",
    "Dez na tela, confete imaginário no teto. Que show foi esse!",
    "Perfeição na nota e alegria no refrão. Pode pedir seu bis!",
  ],
};
export function scoreFeedback(average: number | null, id: string) {
  const mood: ScoreMood =
    average === null
      ? "confused"
      : average < 6
        ? "encouraging"
        : average < 8.5
          ? "groove"
          : "celebration";
  const options = average === 10 ? lines.perfect : lines[mood];
  let seed = 0;
  for (const char of id) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return { mood, phrase: options[seed % options.length] };
}
export function animatedScore(average: number, elapsed: number) {
  const progress = Math.max(0, Math.min(1, elapsed / SCORE_REVEAL_MS));
  return progress === 1
    ? average
    : Math.floor(average * (1 - (1 - progress) ** 3) * 10) / 10;
}
