const createdNodeIds = [];
await Promise.all(
  [
    { family: "Inter", style: "Regular" },
    { family: "Inter", style: "Bold" },
    { family: "Barlow Condensed", style: "Bold" },
    { family: "Barlow Condensed", style: "Black" },
    { family: "IBM Plex Mono", style: "Regular" },
  ].map((f) => figma.loadFontAsync(f)),
);
const page = figma.createPage();
page.name = "01 · Solta a Voz / proposta";
await figma.setCurrentPageAsync(page);
const collection = figma.variables.createVariableCollection(
  "Solta a Voz · direção 02",
);
const mode = collection.defaultModeId;
const hex = (s) => ({
  r: parseInt(s.slice(1, 3), 16) / 255,
  g: parseInt(s.slice(3, 5), 16) / 255,
  b: parseInt(s.slice(5, 7), 16) / 255,
});
const palette = {
  paper: "#F4F0E7",
  ink: "#23231F",
  red: "#B93E28",
  warm: "#E4C15C",
  muted: "#6D6B63",
  line: "#D4CFC2",
  white: "#FFFFFF",
  stage: "#171A17",
  surface: "#272C27",
  light: "#EDEAD8",
};
const vars = {};
for (const [name, value] of Object.entries(palette)) {
  const v = figma.variables.createVariable(
    "color/" + name,
    collection,
    "COLOR",
  );
  v.scopes = ["FRAME_FILL", "SHAPE_FILL", "TEXT_FILL", "STROKE_COLOR"];
  v.setValueForMode(mode, hex(value));
  vars[name] = v;
}
for (const [name, value] of Object.entries({
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
})) {
  const v = figma.variables.createVariable(
    "space/" + name,
    collection,
    "FLOAT",
  );
  v.scopes = ["GAP"];
  v.setValueForMode(mode, value);
  vars["space/" + name] = v;
}
const paint = (name) =>
  figma.variables.setBoundVariableForPaint(
    { type: "SOLID", color: hex(palette[name]) },
    "color",
    vars[name],
  );
function txt(
  parent,
  name,
  content,
  size = 16,
  color = "ink",
  family = "Inter",
  style = "Regular",
  width,
) {
  const n = figma.createText();
  createdNodeIds.push(n.id);
  n.name = name;
  n.fontName = { family, style };
  n.fontSize = size;
  n.lineHeight = {
    unit: "PERCENT",
    value: family === "Barlow Condensed" ? 94 : 140,
  };
  n.characters = content;
  n.fills = [paint(color)];
  parent.appendChild(n);
  if (width) {
    n.textAutoResize = "HEIGHT";
    n.resize(width, n.height);
  }
  return n;
}
function frame(name, w, h, direction = "VERTICAL", color = "paper") {
  const f = figma.createAutoLayout();
  createdNodeIds.push(f.id);
  f.name = name;
  f.layoutMode = direction;
  f.resize(w, h);
  f.primaryAxisSizingMode = "FIXED";
  f.counterAxisSizingMode = "FIXED";
  f.fills = color ? [paint(color)] : [];
  f.itemSpacing = 16;
  f.clipsContent = false;
  return f;
}
const board = frame(
  "00 · Direção de arte / cartaz + ficha de música",
  1440,
  660,
);
board.x = 120;
board.y = 120;
board.paddingLeft = 48;
board.paddingRight = 48;
board.paddingTop = 40;
board.paddingBottom = 40;
board.itemSpacing = 28;
txt(board, "Marca", "SOLTA A VOZ", 30, "red", "Barlow Condensed", "Black");
txt(
  board,
  "Manifesto visual",
  "UM PALCO DE VERDADE.\nUMA INTERFACE QUE SAI DA FRENTE.",
  72,
  "ink",
  "Barlow Condensed",
  "Black",
  1280,
);
txt(
  board,
  "Intenção",
  "Cartaz de show independente + ficha de pedido de bar. Ritmo pela tipografia e pelas linhas, com superfícies simples e hierarquia clara.",
  18,
  "muted",
  "Inter",
  "Regular",
  1100,
);
const swatches = frame("Paleta", 1320, 108, "HORIZONTAL", null);
board.appendChild(swatches);
swatches.itemSpacing = 12;
for (const name of ["paper", "ink", "red", "warm", "stage"]) {
  const swatch = frame(name, 250, 100, "VERTICAL", name);
  swatch.paddingLeft = 16;
  swatch.paddingTop = 18;
  swatch.itemSpacing = 4;
  swatches.appendChild(swatch);
  txt(
    swatch,
    "Nome",
    name.toUpperCase(),
    12,
    ["ink", "red", "stage"].includes(name) ? "paper" : "ink",
    "IBM Plex Mono",
  );
  txt(
    swatch,
    "Hex",
    palette[name],
    16,
    ["ink", "red", "stage"].includes(name) ? "paper" : "ink",
  );
}
txt(
  board,
  "Tipografia",
  "Barlow Condensed Black / títulos e palco    •    Inter / leitura e controles    •    IBM Plex Mono / códigos e números",
  14,
  "muted",
);
const row = figma.createComponent();
createdNodeIds.push(row.id);
row.name = "SongRow / ficha";
row.x = 1660;
row.y = 120;
row.layoutMode = "HORIZONTAL";
row.resize(342, 83);
row.primaryAxisSizingMode = "FIXED";
row.counterAxisSizingMode = "FIXED";
row.counterAxisAlignItems = "CENTER";
row.itemSpacing = 12;
row.paddingTop = 16;
row.paddingBottom = 16;
row.fills = [];
row.strokes = [paint("line")];
row.strokeWeight = 1;
row.strokeTopWeight = 0;
row.strokeLeftWeight = 0;
row.strokeRightWeight = 0;
const number = txt(row, "Position", "01", 14, "red", "IBM Plex Mono");
number.resize(28, 24);
const content = frame("Informações da música", 272, 52, "VERTICAL", null);
content.itemSpacing = 3;
row.appendChild(content);
txt(content, "Song title", "Evidências", 17, "ink", "Inter", "Bold", 272);
txt(
  content,
  "Singer",
  "Marina · 1ª vez no palco",
  12,
  "muted",
  "Inter",
  "Regular",
  272,
);
for (const [name, node] of [
  ["Title", content.children[0]],
  ["Singer", content.children[1]],
  ["Position", number],
]) {
  const prop = row.addComponentProperty(name, "TEXT", node.characters);
  node.componentPropertyReferences = { characters: prop };
}
row.description =
  "Linha reutilizável de música e participante, sem cartões empilhados. Mantém a prioridade legível e o cantor identificável.";
const nav = figma.createComponent();
createdNodeIds.push(nav.id);
nav.name = "MobileNavigation / texto";
nav.layoutMode = "HORIZONTAL";
nav.resize(390, 68);
nav.primaryAxisSizingMode = "FIXED";
nav.counterAxisSizingMode = "FIXED";
nav.counterAxisAlignItems = "CENTER";
nav.primaryAxisAlignItems = "SPACE_BETWEEN";
nav.paddingLeft = 24;
nav.paddingRight = 24;
nav.fills = [paint("paper")];
nav.strokes = [paint("line")];
nav.strokeWeight = 1;
nav.strokeBottomWeight = 0;
nav.strokeLeftWeight = 0;
nav.strokeRightWeight = 0;
nav.x = 1660;
nav.y = 260;
for (const label of ["Sala", "Buscar", "Fila", "Pessoas"])
  txt(nav, label, label, 13, "muted", "Inter", "Bold");
nav.description =
  "Navegação por nomes explícitos. A seção ativa usa vermelho e sublinhado; sem emojis decorativos nos controles.";
const bodyStyle = await figma.importStyleByKeyAsync(
  "cebee1b62ea594fa8f97b0b247fd163730736f2a",
);
return {
  pageId: page.id,
  boardId: board.id,
  collectionId: collection.id,
  variableIds: Object.fromEntries(
    Object.entries(vars).map(([k, v]) => [k, v.id]),
  ),
  songRowId: row.id,
  songProperties: row.componentPropertyDefinitions,
  navId: nav.id,
  bodyStyleId: bodyStyle.id,
  createdNodeIds,
  fonts: ["Inter", "Barlow Condensed", "IBM Plex Mono"],
};
