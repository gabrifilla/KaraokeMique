await figma.setCurrentPageAsync(await figma.getNodeByIdAsync("4:2"));
await Promise.all(
  [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Bold" },
    { family: "Barlow Condensed", style: "Black" },
    { family: "Barlow Condensed", style: "Bold" },
    { family: "IBM Plex Mono", style: "Regular" },
  ].map((f) => figma.loadFontAsync(f)),
);
const ids = [],
  screens = {},
  links = [];
const names = [
  "paper",
  "ink",
  "red",
  "warm",
  "muted",
  "line",
  "white",
  "stage",
  "surface",
  "light",
];
const vars = {};
for (let k = 0; k < names.length; k++)
  vars[names[k]] = await figma.variables.getVariableByIdAsync(
    "VariableID:4:" + (4 + k),
  );
const gap = await figma.variables.getVariableByIdAsync("VariableID:4:16");
const paint = (k) =>
  figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: { r: 0, g: 0, b: 0 } },
    "color",
    vars[k],
  );
const track = (n) => (ids.push(n.id), n);
function box(parent, name, w, h, dir = "VERTICAL", color = null) {
  const n = track(figma.createAutoLayout());
  n.name = name;
  n.layoutMode = dir;
  n.resize(w, h);
  n.primaryAxisSizingMode = "FIXED";
  n.counterAxisSizingMode = "FIXED";
  n.itemSpacing = 16;
  n.setBoundVariable("itemSpacing", gap);
  n.fills = color ? [paint(color)] : [];
  n.clipsContent = false;
  parent.appendChild(n);
  return n;
}
function text(
  p,
  s,
  size = 16,
  color = "ink",
  family = "Inter",
  style = "Regular",
  w = 800,
) {
  const n = track(figma.createText());
  n.name = s.split("\n")[0];
  n.fontName = { family, style };
  n.fontSize = size;
  n.lineHeight = {
    unit: "PERCENT",
    value: family === "Barlow Condensed" ? 96 : 140,
  };
  n.characters = s;
  n.fills = [paint(color)];
  n.textAutoResize = "HEIGHT";
  n.resize(w, n.height);
  p.appendChild(n);
  return n;
}
const bs = await figma.importComponentSetByKeyAsync(
  "cc8b558dc7d9684011b6b99ce8e6509399bc836b",
);
const buttonBase = bs.children.find(
  (n) => n.name === "Variant=Primary, State=Default, Size=Medium",
);
function button(p, s, w = 300, target) {
  const n = track(buttonBase.createInstance());
  p.appendChild(n);
  n.setProperties({ "Label#2:0": s });
  n.resize(w, 56);
  n.cornerRadius = 4;
  n.fills = [paint("red")];
  for (const t of n.findAllWithCriteria({ types: ["TEXT"] }))
    t.fills = [paint("white")];
  if (target) links.push({ id: n.id, target });
  return n;
}
const mobiles = figma.currentPage.children.filter(
  (n) => n.type === "FRAME" && /^\d\d \//.test(n.name),
);
for (const m of mobiles) {
  m.setBoundVariable("itemSpacing", gap);
  ids.push(m.id);
}
let p = box(
  figma.currentPage,
  "16 / Desktop · entrada",
  1440,
  900,
  "VERTICAL",
  "paper",
);
p.x = 120;
p.y = 3820;
p.paddingTop = 32;
p.paddingLeft = 64;
p.paddingRight = 64;
p.paddingBottom = 36;
p.itemSpacing = 40;
screens.desktopHome = p;
let h = box(p, "Cabeçalho", 1312, 48, "HORIZONTAL");
h.primaryAxisAlignItems = "SPACE_BETWEEN";
text(h, "SOLTA A VOZ", 35, "ink", "Barlow Condensed", "Black", 420);
text(
  h,
  "KARAOKÊ EM GRUPO / SEM INSTALAR NADA",
  11,
  "muted",
  "IBM Plex Mono",
  "Regular",
  380,
);
let hero = box(p, "Cartaz da noite", 1312, 566, "HORIZONTAL");
hero.itemSpacing = 70;
const left = box(hero, "Convite principal", 740, 560);
left.itemSpacing = 24;
text(
  left,
  "UM MICROFONE. TODA A GALERA.",
  12,
  "red",
  "IBM Plex Mono",
  "Regular",
  700,
);
text(left, "HOJE TEM\nKARAOKÊ.", 174, "ink", "Barlow Condensed", "Black", 740);
text(
  left,
  "Crie uma sala, escolha as músicas e chame seus amigos.\nCada um entra pelo celular. A TV vira o palco.",
  18,
  "muted",
  "Inter",
  "Regular",
  700,
);
const actions = box(left, "Entrar ou criar", 700, 56, "HORIZONTAL");
button(actions, "Criar uma sala", 280, "5:845");
const enter = text(
  actions,
  "Já tenho um código",
  16,
  "red",
  "Inter",
  "Bold",
  280,
);
links.push({ id: enter.id, target: "5:872" });
const ticket = box(hero, "Ingresso da festa", 480, 520, "VERTICAL", "warm");
ticket.paddingTop = 32;
ticket.paddingLeft = 32;
ticket.paddingRight = 32;
ticket.itemSpacing = 20;
text(
  ticket,
  "ENTRADA LIVRE / TALENTO OPCIONAL",
  10,
  "ink",
  "IBM Plex Mono",
  "Regular",
  416,
);
const image = track(figma.createRectangle());
ticket.appendChild(image);
image.name = "Mascote original";
image.resize(380, 310);
image.fills = [
  {
    type: "IMAGE",
    imageHash: "b1a1cbcbbcc7a61a3d97e4d1bf5007f312f1e830",
    scaleMode: "FIT",
  },
];
text(
  ticket,
  "O PRÓXIMO SHOW É NOSSO.",
  37,
  "ink",
  "Barlow Condensed",
  "Bold",
  416,
);
text(
  ticket,
  "Traga a voz. Os amigos fazem o coro.",
  13,
  "ink",
  "Inter",
  "Regular",
  416,
);
const how = box(p, "Como a noite funciona", 1312, 120, "HORIZONTAL");
how.itemSpacing = 40;
for (const [n, title, desc] of [
  ["01", "Abra o palco", "Uma sala e um QR code para juntar todo mundo."],
  ["02", "Escolha sua música", "A fila dá vez a quem cantou menos."],
  [
    "03",
    "Cante. Aplauda. Repita.",
    "Notas e reações para participar da festa.",
  ],
]) {
  const step = box(how, title, 410, 112);
  step.itemSpacing = 8;
  text(step, n, 12, "red", "IBM Plex Mono", "Regular", 410);
  text(step, title, 24, "ink", "Barlow Condensed", "Bold", 410);
  text(step, desc, 13, "muted", "Inter", "Regular", 390);
}
const qrSvg = __QR_SVG__;
function stage(key, name, x, y, state) {
  const f = box(figma.currentPage, name, 1280, 720, "VERTICAL", "stage");
  f.x = x;
  f.y = y;
  f.paddingLeft = 36;
  f.paddingRight = 36;
  f.paddingTop = 24;
  f.paddingBottom = 24;
  f.itemSpacing = 20;
  f.clipsContent = true;
  screens[key] = f;
  const header = box(f, "Cabeçalho do palco", 1208, 38, "HORIZONTAL");
  header.primaryAxisAlignItems = "SPACE_BETWEEN";
  text(header, "SOLTA A VOZ", 30, "light", "Barlow Condensed", "Black", 380);
  text(
    header,
    "SÁBADO NA MARINA / 8 NA SALA",
    11,
    "light",
    "IBM Plex Mono",
    "Regular",
    380,
  );
  text(header, state, 11, "warm", "IBM Plex Mono", "Regular", 220);
  const body = box(
    f,
    "Palco e convite sempre separado",
    1208,
    524,
    "HORIZONTAL",
  );
  body.itemSpacing = 32;
  const main = box(body, "Conteúdo principal", 916, 524);
  main.itemSpacing = 12;
  const side = box(body, "Convite e próximas vozes", 260, 524);
  side.itemSpacing = 18;
  const invite = box(
    side,
    "Convite fixo / QR fora do player",
    260,
    328,
    "VERTICAL",
    "paper",
  );
  invite.paddingLeft = 20;
  invite.paddingTop = 16;
  invite.paddingBottom = 16;
  invite.itemSpacing = 8;
  text(
    invite,
    "ENTRE PELO CELULAR",
    11,
    "ink",
    "IBM Plex Mono",
    "Regular",
    220,
  );
  const qr = track(figma.createNodeFromSvg(qrSvg));
  qr.name = "QR ilustrativo / convite da sala";
  qr.resize(220, 220);
  invite.appendChild(qr);
  text(invite, "7X4R8P2A", 26, "ink", "IBM Plex Mono", "Regular", 220);
  text(side, "NA SEQUÊNCIA", 11, "warm", "IBM Plex Mono", "Regular", 260);
  for (const [number, song, singer] of [
    ["01", "Anna Júlia", "João"],
    ["02", "O Sol", "Rafa"],
    ["03", "Como nossos pais", "Marina"],
  ]) {
    const next = box(side, "Próxima " + number, 260, 38, "HORIZONTAL");
    next.itemSpacing = 12;
    text(next, number, 13, "warm", "IBM Plex Mono", "Regular", 25);
    text(next, song + " · " + singer, 14, "light", "Inter", "Regular", 220);
  }
  const reactions = box(
    f,
    "Faixa exclusiva de reações / nunca cobre player ou QR",
    1208,
    66,
    "HORIZONTAL",
    "surface",
  );
  reactions.paddingLeft = 24;
  reactions.counterAxisAlignItems = "CENTER";
  reactions.itemSpacing = 36;
  text(
    reactions,
    "A GALERA FAZ O CORO",
    11,
    "light",
    "IBM Plex Mono",
    "Regular",
    270,
  );
  text(reactions, "👏    🔥    ❤️    🎉", 30, "light", "Inter", "Regular", 430);
  text(
    reactions,
    "GIFs · Powered By GIPHY",
    10,
    "light",
    "Inter",
    "Regular",
    260,
  );
  return { frame: f, main };
}
let st = stage(
  "stageLobby",
  "17 / Palco · lobby",
  1680,
  3820,
  "AGUARDANDO A GALERA",
);
let area = box(st.main, "Boas-vindas no palco", 916, 524, "VERTICAL", "stage");
area.itemSpacing = 20;
area.primaryAxisAlignItems = "CENTER";
text(
  area,
  "O MICROFONE\nTÁ NA MESA.",
  112,
  "light",
  "Barlow Condensed",
  "Black",
  900,
);
text(
  area,
  "Entre pelo QR code e escolha a primeira música.\nO palco está pronto; falta a sua voz.",
  24,
  "light",
  "Inter",
  "Regular",
  800,
);
st = stage("stagePlaying", "18 / Palco · apresentação", 120, 4840, "AO VIVO");
text(st.main, "EVIDÊNCIAS", 44, "light", "Barlow Condensed", "Black", 916);
text(
  st.main,
  "Marina · Chitãozinho & Xororó",
  16,
  "light",
  "Inter",
  "Regular",
  916,
);
const player = box(
  st.main,
  "Área reservada ao player YouTube / 16:9",
  916,
  410,
  "VERTICAL",
  "surface",
);
player.primaryAxisAlignItems = "CENTER";
player.counterAxisAlignItems = "CENTER";
text(
  player,
  "PLAYER DO YOUTUBE",
  19,
  "light",
  "IBM Plex Mono",
  "Regular",
  600,
).textAlignHorizontal = "CENTER";
text(
  player,
  "Vídeo e controles nativos preservados.\nNenhuma reação ou convite sobre esta área.",
  17,
  "light",
  "Inter",
  "Regular",
  600,
).textAlignHorizontal = "CENTER";
st = stage("stageVoting", "19 / Palco · votação", 1500, 4840, "VOTAÇÃO ABERTA");
const voting = box(st.main, "Placar de votação", 916, 524);
voting.itemSpacing = 20;
voting.primaryAxisAlignItems = "CENTER";
text(
  voting,
  "MARINA DEU UM SHOW.",
  64,
  "light",
  "Barlow Condensed",
  "Black",
  900,
);
text(voting, "08", 190, "warm", "Barlow Condensed", "Black", 800);
text(
  voting,
  "SEGUNDOS PARA VOTAR PELO CELULAR",
  16,
  "light",
  "IBM Plex Mono",
  "Regular",
  900,
);
text(
  voting,
  "5 de 7 votos recebidos · notas de 0 a 10",
  18,
  "light",
  "Inter",
  "Regular",
  900,
);
st = stage("stageResults", "20 / Palco · resultado", 120, 5680, "RESULTADO");
const result = box(st.main, "Média e celebração", 916, 524);
result.itemSpacing = 14;
result.primaryAxisAlignItems = "CENTER";
text(
  result,
  "APLAUSOS PARA MARINA.",
  58,
  "light",
  "Barlow Condensed",
  "Black",
  900,
);
text(result, "10,0", 194, "warm", "Barlow Condensed", "Black", 900);
text(
  result,
  "7 VOTOS / EVIDÊNCIAS",
  14,
  "light",
  "IBM Plex Mono",
  "Regular",
  900,
);
text(
  result,
  "Um bis? Marina decide pelo celular.",
  22,
  "light",
  "Inter",
  "Regular",
  900,
);
st = stage(
  "stageRecovery",
  "21 / Palco · recuperação",
  1500,
  5680,
  "REPRODUÇÃO INTERROMPIDA",
);
const recovery = box(st.main, "Falha com caminho de recuperação", 916, 524);
recovery.itemSpacing = 28;
recovery.primaryAxisAlignItems = "CENTER";
text(
  recovery,
  "UMA PAUSA.\nA FESTA CONTINUA.",
  96,
  "light",
  "Barlow Condensed",
  "Black",
  900,
);
text(
  recovery,
  "Não foi possível continuar este vídeo.\nA anfitriã pode retomar ou escolher outro pelo celular.",
  23,
  "light",
  "Inter",
  "Regular",
  850,
);
text(
  recovery,
  "Sua fila e os resultados continuam na sala.",
  16,
  "warm",
  "Inter",
  "Regular",
  850,
);
for (const { id, target } of links) {
  const node = await figma.getNodeByIdAsync(id);
  await node.setReactionsAsync([
    {
      trigger: { type: "ON_CLICK" },
      actions: [
        {
          type: "NODE",
          destinationId: target,
          navigation: "NAVIGATE",
          transition: null,
        },
      ],
    },
  ]);
}
const pair = await figma.getNodeByIdAsync("5:1180");
await pair.setReactionsAsync([
  {
    trigger: { type: "ON_CLICK" },
    actions: [
      {
        type: "NODE",
        destinationId: screens.stageLobby.id,
        navigation: "NAVIGATE",
        transition: null,
      },
    ],
  },
]);
ids.push(pair.id);
const resultOriginal = await figma.getNodeByIdAsync("5:1106");
const viewer = track(resultOriginal.clone());
viewer.name = "15 / Resultado · plateia";
viewer.x = 1060;
viewer.y = 2820;
for (const n of [...viewer.children])
  if (
    n.name === "Oferta de bis" ||
    n.name === "Quero cantar meu bis" ||
    n.name === "Passo a vez"
  )
    n.remove();
const heading = viewer.findOne(
  (n) => n.type === "TEXT" && n.characters === "ESSA MERECE\nMAIS UMA.",
);
heading.characters = "BOM SHOW,\nMARINA.";
text(
  viewer,
  "Marina recebeu uma oferta de bis.\nA próxima música será preparada pela anfitriã.",
  14,
  "muted",
  "Inter",
  "Regular",
  342,
);
const back = button(viewer, "Acompanhar a fila", 342, "5:992");
await back.setReactionsAsync([
  {
    trigger: { type: "ON_CLICK" },
    actions: [
      {
        type: "NODE",
        destinationId: "5:992",
        navigation: "NAVIGATE",
        transition: null,
      },
    ],
  },
]);
screens.resultViewer = viewer;
const voteButton = await figma.getNodeByIdAsync("5:1099");
await voteButton.setReactionsAsync([
  {
    trigger: { type: "ON_CLICK" },
    actions: [
      {
        type: "NODE",
        destinationId: viewer.id,
        navigation: "NAVIGATE",
        transition: null,
      },
    ],
  },
]);
ids.push(voteButton.id);
return {
  screens: Object.fromEntries(
    Object.entries(screens).map(([k, n]) => [
      k,
      { id: n.id, width: n.width, height: n.height },
    ]),
  ),
  createdNodeIds: ids,
  mutatedNodeIds: mobiles.map((n) => n.id),
};
