import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { QRCodeSVG } from "qrcode.react";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("design/assets", { recursive: true });
writeFileSync(
  "design/assets/invite-qr.svg",
  renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: "https://example.com/join/7X4R8P2A",
      size: 220,
      level: "M",
      marginSize: 4,
    }),
  ),
);
