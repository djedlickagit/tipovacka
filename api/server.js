import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import matchesRoutes from "./routes/matches.routes.js";
import tipsRoutes from "./routes/tips.routes.js";
import evaluateRoutes from "./routes/evaluate.routes.js";
import leaderboardRoutes from "./routes/leaderboard.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import syncRoutes from "./routes/sync.routes.js";
import standingsRoutes from "./routes/standings.routes.js";
import publicRoutes from "./routes/public.routes.js";
import resultsSyncRoutes from "./routes/results-sync.routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 5051);

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    app: "Tipovačka MS 2026 API",
    port: PORT,
    time: new Date().toISOString(),
  });
});

app.use("/api/public", publicRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/matches", matchesRoutes);
app.use("/api/tips", tipsRoutes);
app.use("/api/evaluate", evaluateRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/standings", standingsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/results-sync", resultsSyncRoutes);

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

app.use((req, res) => {
  res.status(404).json({ error: "Endpoint nenalezen.", path: req.path });
});

app.listen(PORT, () => {
  console.log(`Tipovačka MS 2026 API běží na http://localhost:${PORT}`);
  console.log("Výchozí admin: admin / admin2026");
});
