import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { build } from "vite";

const require = createRequire(import.meta.url);
if (existsSync(".env.server")) process.loadEnvFile(".env.server");
const tsc = resolve(
  dirname(require.resolve("typescript/package.json")),
  "bin/tsc",
);
execFileSync(process.execPath, [tsc, "--noEmit"], { stdio: "inherit" });
await build({ root: "apps/web", configFile: resolve("vite.config.ts") });
execFileSync(process.execPath, [tsc, "-p", "tsconfig.server.json"], {
  stdio: "inherit",
});
mkdirSync("dist/server/apps/api/migrations", { recursive: true });
for (const file of ["001_initial.sql", "002_push.sql"])
  copyFileSync(
    `apps/api/migrations/${file}`,
    `dist/server/apps/api/migrations/${file}`,
  );
console.log(
  "Build completo: dist/web + dist/server. Backend pronto para executar com Node, sem tsx/Vite.",
);
