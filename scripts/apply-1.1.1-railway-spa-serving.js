#!/usr/bin/env node
import fs from "fs";
import path from "path";

const serverPath = path.join(process.cwd(), "api", "server.js");
if (!fs.existsSync(serverPath)) {
  console.error("Nenalezen api/server.js. Spusť skript z kořene projektu.");
  process.exit(1);
}

let src = fs.readFileSync(serverPath, "utf8");

if (!src.includes('import path from "path";')) {
  src = src.replace('import dotenv from "dotenv";\n', 'import dotenv from "dotenv";\nimport path from "path";\nimport { fileURLToPath } from "url";\n');
}

if (!src.includes('const __filename = fileURLToPath(import.meta.url);')) {
  src = src.replace('dotenv.config();\n', 'dotenv.config();\n\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);\n');
}

const staticBlock = `
const webDistPath = path.join(__dirname, "web", "dist");
const hasWebBuild = fs.existsSync(path.join(webDistPath, "index.html"));

if (hasWebBuild) {
  app.use(express.static(webDistPath));

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(webDistPath, "index.html"));
  });
} else {
  console.warn("⚠️ Web build nenalezen v api/web/dist. Spusť: cd web && npm run build && cp -R dist ../api/web/dist");
}
`;

if (!src.includes('const webDistPath = path.join(__dirname, "web", "dist");')) {
  src = src.replace(`app.use("/api/results-sync", resultsSyncRoutes);\n\napp.use((req, res) => {`, `app.use("/api/results-sync", resultsSyncRoutes);\n${staticBlock}\napp.use((req, res) => {`);
}

if (!src.includes('import fs from "fs";')) {
  src = src.replace('import path from "path";\n', 'import path from "path";\nimport fs from "fs";\n');
}

fs.writeFileSync(serverPath, src);
console.log("✅ Opraveno: api/server.js nyní servíruje React build z api/web/dist a podporuje SPA fallback.");
