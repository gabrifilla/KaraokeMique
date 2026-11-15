const page = await figma.getNodeByIdAsync("4:2");
await figma.setCurrentPageAsync(page);
await Promise.all(
  [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Bold" },
    { family: "Barlow Condensed", style: "Black" },
    { family: "Barlow Condensed", style: "Bold" },
    { family: "IBM Plex Mono", style: "Regular" },
  ].map((f) => figma.loadFontAsync(f)),
);
const ids = [];
const screens = {};
const links = [];
const keys = {
  paper: "4:4",
  ink: "4:5",
  red: "4:6",
  warm: "4:7",
  muted: "4:8",
  line: "4:9",
  white: "4:10",
  stage: "4:11",
  surface: "4:12",
  light: "4:13",
};
const vars = {};
for (const [key, id] of Object.entries(keys))
  vars[key] = await figma.variables.getVariableByIdAsync("VariableID:" + id);
const spacing = await figma.variables.getVariableByIdAsync("VariableID:4:16");
const paint = (k) =>
  figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } },
    "color",
    vars[k],
  );
const buttonSet = await figma.importComponentSetByKeyAsync(
  "cc8b558dc7d9684011b6b99ce8e6509399bc836b",
);
const inputSet = await figma.importComponentSetByKeyAsync(
  "c28150b04d333d34ed9d2b77abd9f2f54e1a878a",
);
const base = buttonSet.children.find(
    (n) => n.name === "Variant=Primary, State=Default, Size=Medium",
  ),
  inputBase = inputSet.children.find(
    (n) => n.name === "State=Default, Value Type=Default",
  ),
  songBase = await figma.getNodeByIdAsync("4:41"),
  navBase = await figma.getNodeByIdAsync("4:46");
const bodyStyle = await figma.importStyleByKeyAsync(
  "cebee1b62ea594fa8f97b0b247fd163730736f2a",
);
function track(n) {
  ids.push(n.id);
  return n;
}
function box(parent, name, w, h, dir = "VERTICAL", color = null) {
  const n = track(figma.createAutoLayout());
  n.name = name;
  n.layoutMode = dir;
  n.resize(w, h);
  n.primaryAxisSizingMode = "FIXED";
  n.counterAxisSizingMode = "FIXED";
  n.fills = color ? [paint(color)] : [];
  n.itemSpacing = 16;
  n.setBoundVariable("itemSpacing", spacing);
  n.clipsContent = false;
  parent.appendChild(n);
  return n;
}
function text(
  parent,
  content,
  size = 16,
  color = "ink",
  family = "Inter",
  style = "Regular",
  width = 342,
) {
  const n = track(figma.createText());
  n.name = content.split("\n")[0];
  n.fontName = { family, style };
  if (family === "Inter" && style === "Regular") n.textStyleId = bodyStyle.id;
  n.fontSize = size;
  n.lineHeight = {
    unit: "PERCENT",
    value: family === "Barlow Condensed" ? 96 : 140,
  };
  n.characters = content;
  n.fills = [paint(color)];
  n.textAutoResize = "HEIGHT";
  n.resize(width, n.height);
  parent.appendChild(n);
  return n;
}
function label(p, s) {
  return text(p, s, 10, "red", "IBM Plex Mono", "Regular");
}
function title(p, s, size = 48) {
  return text(p, s, size, "ink", "Barlow Condensed", "Black");
}
function spacer(p, h = 12) {
  return box(p, "Respiro", 342, h);
}
function button(p, label, target, secondary = false) {
  const n = track(base.createInstance());
  n.name = label;
  p.appendChild(n);
  n.setProperties({ "Label#2:0": label });
  n.resize(342, 52);
  n.cornerRadius = 4;
  n.fills = [paint(secondary ? "paper" : "red")];
  n.strokes = secondary ? [paint("ink")] : [];
  for (const t of n.findAllWithCriteria({ types: ["TEXT"] }))
    t.fills = [paint(secondary ? "ink" : "white")];
  if (target) links.push({ id: n.id, target });
  return n;
}
function field(p, label, value) {
  const n = track(inputBase.createInstance());
  p.appendChild(n);
  n.setProperties({
    "Has Label#57:0": true,
    "Has Description#611:20": false,
    "Has Error#72:6": false,
    "Label#280:41": label,
    "Value#630:14": value,
  });
  n.resize(342, 76);
  for (const f of n.findAllWithCriteria({ types: ["FRAME"] })) {
    f.cornerRadius = 4;
    if (Array.isArray(f.fills) && f.fills.length) f.fills = [paint("paper")];
  }
  for (const t of n.findAllWithCriteria({ types: ["TEXT"] }))
    t.fills = [paint("ink")];
  return n;
}
function song(p, pos, name, who, target) {
  const n = track(songBase.createInstance());
  p.appendChild(n);
  n.setProperties({
    "Title#4:0": name,
    "Singer#4:1": who,
    "Position#4:2": pos,
  });
  if (target) links.push({ id: n.id, target });
  return n;
}
function mascot(p, w = 116, h = 128) {
  const n = track(figma.createRectangle());
  n.name = "Mascote original / boas-vindas";
  n.resize(w, h);
  n.fills = [
    {
      type: "IMAGE",
      imageHash: "b1a1cbcbbcc7a61a3d97e4d1bf5007f312f1e830",
      scaleMode: "FIT",
    },
  ];
  p.appendChild(n);
  return n;
}
function header(p) {
  const row = box(p, "Marca e convite", 342, 28, "HORIZONTAL");
  row.primaryAxisAlignItems = "SPACE_BETWEEN";
  text(row, "SOLTA A VOZ", 23, "ink", "Barlow Condensed", "Black", 170);
  text(row, "7X4R8P2A", 11, "muted", "IBM Plex Mono", "Regular", 94);
}
function mobile(key, name, x, y, nav = "Sala") {
  const n = box(page, name, 390, 844, "VERTICAL", "paper");
  n.x = x;
  n.y = y;
  n.paddingTop = 26;
  n.paddingLeft = 24;
  n.paddingRight = 24;
  n.paddingBottom = 90;
  n.itemSpacing = 24;
  n.setBoundVariable("itemSpacing", awaitedSpacing);
  n.clipsContent = true;
  header(n);
  screens[key] = n;
  if (nav) {
    const v = track(navBase.createInstance());
    n.appendChild(v);
    v.layoutPositioning = "ABSOLUTE";
    v.x = 0;
    v.y = 776;
    for (const t of v.findAllWithCriteria({ types: ["TEXT"] })) {
      if (t.name === nav) {
        t.fills = [paint("red")];
        t.textDecoration = "UNDERLINE";
      }
      links.push({
        id: t.id,
        target: {
          Sala: "room",
          Buscar: "search",
          Fila: "queue",
          Pessoas: "people",
        }[t.name],
      });
    }
  }
  return n;
}
const awaitedSpacing =
  await figma.variables.getVariableByIdAsync("VariableID:4:17");
let p = mobile("home", "01 / Início", 120, 900, null);
label(p, "KARAOKÊ EM GRUPO");
title(p, "HOJE TEM\nKARAOKÊ.", 94);
text(p, "Chame a galera. Escolham as músicas.\nO resto é cantar.", 17, "muted");
const welcome = box(p, "Convite à festa", 342, 146, "HORIZONTAL", "warm");
welcome.paddingLeft = 18;
welcome.paddingTop = 8;
welcome.counterAxisAlignItems = "CENTER";
text(
  welcome,
  "O próximo show\né de vocês.",
  28,
  "ink",
  "Barlow Condensed",
  "Bold",
  184,
);
mascot(welcome, 110, 126);
button(p, "Criar uma sala", "create");
button(p, "Já tenho um código", "join", true);
text(p, "Uma tela para o palco.\nUm celular para cada pessoa.", 12, "muted");
p = mobile("create", "02 / Criar sala", 590, 900, null);
label(p, "ABRA O PALCO");
title(p, "QUEM VAI\nPUXAR A FESTA?");
field(p, "Seu apelido", "Marina");
field(p, "Nome da sala", "Sábado na Marina");
label(p, "ESCOLHA SEU AVATAR");
text(p, "M     J     R     B     L", 24, "ink", "IBM Plex Mono");
text(
  p,
  "Todo mundo tem sua vez. A fila prioriza quem cantou menos; as notas vão de 0 a 10.",
  13,
  "muted",
);
button(p, "Criar sala e chamar a galera", "room");
p = mobile("join", "03 / Entrar por convite", 1060, 900, null);
label(p, "VOCÊ FOI CONVIDADO");
title(p, "SÁBADO\nNA MARINA", 60);
text(p, "8 pessoas na sala · entradas abertas", 13, "muted");
field(p, "Como a galera te chama?", "João");
label(p, "SEU AVATAR");
text(p, "J     M     R     B     L", 24, "ink", "IBM Plex Mono");
spacer(p, 30);
button(p, "Entrar na sala", "room");
text(
  p,
  "Sem conta. Sem instalar nada.\nSua sessão fica salva neste navegador.",
  12,
  "muted",
);
p = mobile("room", "04 / Sala e próxima vez", 1530, 900);
label(p, "SÁBADO NA MARINA · 8 NA SALA");
title(p, "BORA CANTAR.");
const current = box(p, "Agora no palco", 342, 150, "VERTICAL", "ink");
current.paddingTop = 20;
current.paddingLeft = 20;
current.itemSpacing = 8;
text(current, "AGORA NO PALCO", 10, "warm", "IBM Plex Mono", "Regular", 300);
text(current, "Evidências", 40, "paper", "Barlow Condensed", "Bold", 300);
text(
  current,
  "Marina · Chitãozinho & Xororó",
  13,
  "paper",
  "Inter",
  "Regular",
  300,
);
text(p, "Você é o próximo, João.", 21, "ink", "Inter", "Bold");
button(p, "Escolher uma música", "search");
label(p, "NA SEQUÊNCIA");
song(p, "01", "Anna Júlia", "João · você");
song(p, "02", "O Sol", "Rafa · ainda não cantou");
text(p, "A fila dá vez a quem cantou menos.", 12, "muted");
p = mobile("search", "05 / Busca no YouTube", 2000, 900, "Buscar");
label(p, "ESCOLHA SEU PRÓXIMO HIT");
title(p, "O QUE VOCÊ\nVAI CANTAR?");
field(p, "Música ou artista", "Tim Maia");
text(
  p,
  "Buscamos a versão karaoke para você.\nResultados do YouTube.",
  12,
  "muted",
);
song(p, "01", "Não quero dinheiro", "Karaokê Brasil · 3:18", "confirm");
song(p, "02", "Gostava tanto de você", "Canta Comigo · 4:09", "confirm");
song(
  p,
  "03",
  "O descobridor dos sete mares",
  "Karaokê Brasil · 4:27",
  "confirm",
);
text(p, "Ver mais resultados", 13, "red", "Inter", "Bold");
p = mobile("confirm", "06 / Conferir escolha", 2470, 900, "Buscar");
label(p, "ESSA É A SUA MÚSICA?");
title(p, "NÃO QUERO\nDINHEIRO", 58);
const details = box(p, "Ficha da música", 342, 174, "VERTICAL", "warm");
details.paddingTop = 24;
details.paddingLeft = 20;
details.itemSpacing = 12;
text(details, "TIM MAIA", 11, "ink", "IBM Plex Mono", "Regular", 300);
text(details, "Eu só quero amar…", 29, "ink", "Barlow Condensed", "Bold", 300);
text(
  details,
  "Karaokê Brasil · 3:18\nVídeo do YouTube",
  13,
  "ink",
  "Inter",
  "Regular",
  300,
);
text(p, "Quem vai cantar: você, João.", 16, "ink", "Inter", "Bold");
text(
  p,
  "Confira título e canal antes de adicionar.\nSua posição pode mudar para dar vez a quem cantou menos.",
  13,
  "muted",
);
button(p, "Adicionar à minha fila", "queue");
button(p, "Escolher outra", "search", true);
p = mobile("queue", "07 / Fila justa", 120, 1860, "Fila");
label(p, "A VEZ DE TODO MUNDO");
title(p, "NA ORDEM\nDO MICROFONE.");
text(p, "Previsão da fila · 4 músicas", 13, "muted");
song(p, "01", "Anna Júlia", "João · você · próximo");
song(p, "02", "O Sol", "Rafa · ainda não cantou");
song(p, "03", "Não quero dinheiro", "João · sua segunda música");
song(p, "04", "Como nossos pais", "Marina · 1 turno");
text(
  p,
  "Ter mais músicas na fila não reserva mais turnos. Quem cantou menos vem primeiro.",
  13,
  "muted",
);
button(p, "Adicionar outra música", "search", true);
p = mobile("reactions", "08 / Reações durante música", 590, 1860);
label(p, "AGORA NO PALCO");
title(p, "A GALERA\nFAZ O CORO.");
text(p, "Marina está cantando Evidências.", 16, "muted");
spacer(p, 12);
text(p, "👏    🔥    ❤️", 48, "ink", "Inter", "Regular");
text(p, "🌟    🎉    🎤", 48, "ink", "Inter", "Regular");
spacer(p, 8);
button(p, "Buscar um GIF", "gifs");
text(
  p,
  "As reações aparecem no palco sem cobrir o vídeo ou o QR code.",
  13,
  "muted",
);
label(p, "SUA VEZ ESTÁ CHEGANDO");
song(p, "01", "Anna Júlia", "João · você é o próximo");
p = mobile("vote", "09 / Votação", 1060, 1860);
label(p, "MARINA DEU UM SHOW");
title(p, "QUE NOTA\nESSA VOZ MERECE?", 48);
const count = box(p, "Contagem regressiva", 342, 74, "HORIZONTAL");
text(count, "08", 66, "red", "Barlow Condensed", "Black", 100);
text(
  count,
  "segundos para votar\n5 de 7 votos recebidos",
  13,
  "muted",
  "Inter",
  "Regular",
  200,
);
const grid = box(p, "Notas de zero a dez", 342, 170, "VERTICAL");
grid.itemSpacing = 8;
for (let line = 0; line < 2; line++) {
  const r = box(grid, "Linha de notas", 342, 76, "HORIZONTAL");
  r.itemSpacing = 8;
  for (let v = line * 6; v < Math.min(line * 6 + 6, 11); v++) {
    const cell = box(
      r,
      "Nota " + v,
      50,
      64,
      "VERTICAL",
      v === 9 ? "red" : null,
    );
    cell.primaryAxisAlignItems = "CENTER";
    cell.counterAxisAlignItems = "CENTER";
    cell.strokes = [paint(v === 9 ? "red" : "line")];
    text(
      cell,
      String(v),
      32,
      v === 9 ? "white" : "ink",
      "Barlow Condensed",
      "Bold",
      30,
    ).textAlignHorizontal = "CENTER";
    links.push({ id: cell.id, target: "vote" });
  }
}
button(p, "Confirmar nota 9", "result");
text(
  p,
  "O voto só é enviado quando você confirma.\nVocê não pode votar em si.",
  12,
  "muted",
);
p = mobile("result", "10 / Resultado e bis", 1530, 1860);
label(p, "APLAUSOS PARA MARINA");
title(p, "ESSA MERECE\nMAIS UMA.");
text(p, "10,0", 132, "red", "Barlow Condensed", "Black");
text(p, "Média de 7 votos · Evidências", 13, "muted");
const offer = box(p, "Oferta de bis", 342, 114, "VERTICAL", "warm");
offer.paddingLeft = 20;
offer.paddingTop = 16;
offer.itemSpacing = 8;
text(
  offer,
  "UM BIS PRA CHAMAR DE SEU.",
  25,
  "ink",
  "Barlow Condensed",
  "Bold",
  300,
);
text(
  offer,
  "Sua próxima música já está na fila.\nQuer cantar mais uma agora?",
  13,
  "ink",
  "Inter",
  "Regular",
  300,
);
button(p, "Quero cantar meu bis", "room");
button(p, "Passo a vez", "room", true);
p = mobile("people", "11 / Pessoas e anfitrião", 2000, 1860, "Pessoas");
label(p, "SÁBADO NA MARINA");
title(p, "A GALERA\nDA NOITE.");
song(p, "M", "Marina", "Anfitriã · 1 turno");
song(p, "J", "João", "Conectado · ainda não cantou");
song(p, "R", "Rafa", "Conectado · ainda não cantou");
label(p, "CONTROLES DO ANFITRIÃO");
button(p, "Conectar tela de palco", "pair");
text(
  p,
  "Entradas abertas                         Sim\nPermitir reações                         Sim\nPermitir GIFs                               Sim",
  13,
  "ink",
);
text(p, "Transferir comando   ·   Remover pessoa", 12, "red");
p = mobile("pair", "12 / Parear palco", 2470, 1860, null);
label(p, "UMA TELA PARA TODO MUNDO");
title(p, "PREPARE\nO PALCO.", 64);
text(
  p,
  "Abra /stage/pair no computador conectado à TV. Digite o código autorizado pela anfitriã.",
  16,
  "muted",
);
const code = box(p, "Código temporário", 342, 104, "VERTICAL", "ink");
code.paddingTop = 26;
code.paddingLeft = 24;
text(code, "D8F2 · 4C9A", 34, "paper", "IBM Plex Mono", "Regular", 294);
text(
  p,
  "Válido por 2 minutos · uso único\nUm novo palco substitui o anterior.",
  12,
  "muted",
);
spacer(p, 24);
button(p, "Conectar esta tela", "stageLobby");
p = mobile("gifs", "13 / Busca de GIFs", 120, 2820);
label(p, "REAÇÕES DA GALERA");
title(p, "UM GIF VALE\nMIL APLAUSOS.");
field(p, "Buscar no GIPHY", "Aplausos");
text(p, "Powered By GIPHY", 12, "ink", "Inter", "Bold");
for (const pair of [
  ["Aplausos de pé", "Palmas para essa voz"],
  ["O show continua", "Pediu bis"],
]) {
  const r = box(p, "Resultados do catálogo", 342, 134, "HORIZONTAL");
  r.itemSpacing = 12;
  for (const phrase of pair) {
    const tile = box(r, "GIF / " + phrase, 165, 134, "VERTICAL", "warm");
    tile.paddingLeft = 14;
    tile.paddingTop = 16;
    tile.itemSpacing = 8;
    text(tile, "GIF", 32, "ink", "Barlow Condensed", "Black", 132);
    text(tile, phrase, 12, "ink", "Inter", "Regular", 132);
    links.push({ id: tile.id, target: "reactions" });
  }
}
text(
  p,
  "Prévia de layout: mídia animada vem do GIPHY. Toque para enviar ao palco.",
  12,
  "muted",
);
p = mobile("summary", "14 / Resumo da noite", 590, 2820);
label(p, "ATÉ O PRÓXIMO ENCONTRO");
title(p, "FOI BOM\nDEMAIS.", 74);
text(p, "8 pessoas · 12 apresentações\nSábado na Marina", 16, "muted");
song(p, "9,4", "Evidências", "Marina · 7 votos");
song(p, "8,8", "Anna Júlia", "João · 6 votos");
song(p, "9,1", "O Sol", "Rafa · 7 votos");
button(p, "Começar outra sala", "create");
text(
  p,
  "O resumo fica disponível por 24 horas.\nAs notas avaliam a apresentação em grupo, sem análise de afinação.",
  12,
  "muted",
);
for (const { id, target } of links) {
  if (!screens[target]) continue;
  const node = await figma.getNodeByIdAsync(id);
  let root = node;
  while (root.parent && root.parent.type !== "PAGE") root = root.parent;
  if (root.id === screens[target].id) continue;
  await node.setReactionsAsync([
    {
      trigger: { type: "ON_CLICK" },
      actions: [
        {
          type: "NODE",
          destinationId: screens[target].id,
          navigation: "NAVIGATE",
          transition: null,
        },
      ],
    },
  ]);
}
const bounds = Object.fromEntries(
  Object.entries(screens).map(([k, n]) => [
    k,
    { id: n.id, width: n.width, height: n.height },
  ]),
);
return {
  screens: bounds,
  links: links.filter((x) => screens[x.target]).length,
  createdNodeIds: ids,
  fonts: ["Inter", "Barlow Condensed", "IBM Plex Mono"],
};
