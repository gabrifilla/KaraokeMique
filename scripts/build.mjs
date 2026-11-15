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
copyFileSync(
  "apps/api/migrations/001_initial.sql",
  "dist/server/apps/api/migrations/001_initial.sql",
);
console.log(
  "Build completo: dist/web + dist/server. Backend pronto para executar com Node, sem tsx/Vite.",
);
