import fs from "node:fs";
const body = (navy) => `<path d="M30 108C24 64 70 34 168 40L166 62C110 60 78 76 78 108C78 126 86 138 98 146C58 142 32 130 30 108Z" fill="${navy}"/><circle cx="178" cy="40" r="17" fill="#10B981"/><path d="M84 150C88 126 118 112 204 104L202 126C160 130 132 142 136 160C138 170 146 178 154 184C112 186 80 172 84 150Z" fill="#0D9488"/><circle cx="206" cy="104" r="17" fill="#84CC16"/><path d="M70 200C110 198 150 196 168 182C178 174 176 164 164 158C206 152 228 174 214 198C198 226 130 238 92 230C74 226 66 214 70 200Z" fill="#10B981"/><circle cx="64" cy="204" r="17" fill="#0D9488"/>`;
const d = "public/brand/";
const svg = (vb, inner, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" ${extra}>${inner}</svg>\n`;
fs.writeFileSync(d + "icon.svg", svg("0 0 240 240", body("#102A43"), 'role="img" aria-label="SalesBuzz AI"'));
fs.writeFileSync(d + "icon-dark.svg", svg("0 0 240 240", body("#FFFFFF"), 'role="img" aria-label="SalesBuzz AI"'));
const word = (c) => `<g transform="translate(0 0) scale(0.8)">`;
const wm = (navy, text) => svg("0 0 760 200", `<g transform="translate(0 4) scale(0.8)">${body(navy)}</g><text x="214" y="124" font-family="Manrope, Inter, Arial, sans-serif" font-weight="800" font-size="84" fill="${text}">SalesBuzz <tspan fill="#0D9488">AI</tspan></text>`, 'role="img" aria-label="SalesBuzz AI"');
fs.writeFileSync(d + "logo-horizontal.svg", wm("#102A43", "#102A43"));
fs.writeFileSync(d + "logo-horizontal-dark.svg", wm("#FFFFFF", "#FFFFFF"));
// Favicon: simplified, high contrast at small sizes
fs.writeFileSync(d + "favicon.svg", svg("0 0 64 64", `<rect width="64" height="64" rx="14" fill="#102A43"/><g transform="translate(10 10) scale(0.19)">${body("#FFFFFF")}</g>`));
fs.mkdirSync("src/app", { recursive: true });
fs.copyFileSync(d + "favicon.svg", "src/app/icon.svg");
fs.writeFileSync("src/components/brand-paths.ts", `export const ICON_BODY = ${JSON.stringify(body("NAVY"))};\n`);
