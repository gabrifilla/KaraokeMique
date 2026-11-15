import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, basename } from "node:path";
import { createHash } from "node:crypto";

// O pacote nunca usa o bundle com a chave GIPHY da máquina de desenvolvimento.
execFileSync(process.execPath, ["scripts/build.mjs"], {
  stdio: "inherit",
  env: { ...process.env, VITE_GIPHY_API_KEY: "" },
});
const name = `karaoke-mique-servidor-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const directory = resolve("releases", name);
mkdirSync(directory, { recursive: true });
const entries = [
  "apps",
  "packages",
  "dist",
  "scripts/build.mjs",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.server.json",
  "vite.config.ts",
  "Dockerfile",
  ".dockerignore",
  ".env.server.example",
  "compose.server.yaml",
  "INICIAR.ps1",
  "iniciar.sh",
  "INSTALAR.md",
];
for (const entry of entries) {
  const target = join(directory, entry);
  mkdirSync(resolve(target, ".."), { recursive: true });
  cpSync(entry, target, {
    recursive: true,
    filter: (path) =>
      (!basename(path).startsWith(".env") &&
        basename(path) !== "node_modules") ||
      (path === entry && entry === ".env.server.example"),
  });
}
const manifest = [];
// O pacote de instalação expõe apenas os comandos que leva consigo.
const deploymentPackage = JSON.parse(
  readFileSync(join(directory, "package.json"), "utf8"),
);
deploymentPackage.scripts = {
  build: "node scripts/build.mjs",
  start: "node --env-file=.env.server dist/server/apps/api/src/main.js",
};
writeFileSync(
  join(directory, "package.json"),
  JSON.stringify(deploymentPackage, null, 2) + "\n",
);
function scan(dir) {
  for (const item of readdirSync(dir)) {
    const file = join(dir, item);
    if (statSync(file).isDirectory()) scan(file);
    else
      manifest.push({
        path: file.slice(directory.length + 1).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(readFileSync(file)).digest("hex"),
      });
  }
}
scan(directory);
writeFileSync(
  join(directory, "MANIFEST.json"),
  JSON.stringify(manifest, null, 2),
);
let archive;
if (process.platform === "win32") {
  archive = `${directory}.zip`;
  const psQuote = (value) => `'${value.replaceAll("'", "''")}'`;
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path ${psQuote(join(directory, "*"))} -DestinationPath ${psQuote(archive)}`,
    ],
    { stdio: "inherit" },
  );
} else {
  archive = `${directory}.tar.gz`;
  execFileSync("tar", ["-czf", archive, "-C", resolve("releases"), name], {
    stdio: "inherit",
  });
}
writeFileSync(
  "releases/LATEST.json",
  JSON.stringify({ archive, directory, files: manifest.length }, null, 2),
);
console.log(`Pacote pronto: ${archive}`);
