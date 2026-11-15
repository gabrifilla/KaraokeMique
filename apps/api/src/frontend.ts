import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Request, Response, NextFunction } from "express";
import { existsSync } from "node:fs";
import { resolve, extname, sep } from "node:path";

export function serveFrontend(
  app: NestExpressApplication,
  origin: string,
  directory = resolve("dist/web"),
) {
  const index = resolve(directory, "index.html");
  if (!existsSync(index))
    throw new Error(
      "Frontend não compilado. Execute pnpm build antes de iniciar o servidor.",
    );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      ["GET", "HEAD"].includes(req.method) &&
      !req.path.startsWith("/api/") &&
      !req.path.startsWith("/socket.io/") &&
      req.accepts("html") &&
      req.headers.host !== new URL(origin).host
    ) {
      res.setHeader("Cache-Control", "no-store");
      res.redirect(
        302,
        `${origin}${req.originalUrl.startsWith("/") && !req.originalUrl.startsWith("//") ? req.originalUrl : "/"}`,
      );
      return;
    }
    next();
  });
  app.useStaticAssets(directory, {
    index: false,
    dotfiles: "deny",
    setHeaders(res: Response, file: string) {
      res.setHeader(
        "Cache-Control",
        file.includes(`${sep}assets${sep}`)
          ? "public, max-age=31536000, immutable"
          : "no-cache",
      );
    },
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      !["GET", "HEAD"].includes(req.method) ||
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path.startsWith("/socket.io")
    )
      return next();
    if (
      req.path.split("/").some((part) => part.startsWith(".")) ||
      extname(req.path) ||
      req.path.startsWith("/assets/") ||
      req.path.startsWith("/fonts/")
    ) {
      res.status(404).end();
      return;
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(index);
  });
}
