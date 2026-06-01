import { query } from "../db.js";
import { verifyToken } from "../services/auth.service.js";

export async function auth(req, res, next) {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
    const payload = verifyToken(token);
    const userId = payload?.sub || payload?.id;

    if (!userId) {
      return res.status(401).json({ error: "Nejste přihlášený." });
    }

    const rows = await query(
      "SELECT id, name, login_name, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length || Number(rows[0].is_active) !== 1) {
      return res.status(401).json({ error: "Účet není aktivní nebo neexistuje." });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error("auth", err);
    res.status(401).json({ error: "Přihlášení vypršelo. Přihlaste se znovu." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Tato akce je dostupná pouze adminovi." });
  }

  next();
}
