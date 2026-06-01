import { query } from "../db.js";
import { sha256, signToken, verifyToken } from "../services/auth.service.js";

const rows = await query("SELECT id, name, login_name, role, is_active, password_hash FROM users WHERE login_name = 'admin' LIMIT 1");

if (!rows.length) {
  console.log("Admin nenalezen. Spusť: npm run fix-auth");
  process.exit(1);
}

const admin = rows[0];
const token = signToken(admin);
const payload = verifyToken(token);

console.log({
  admin_found: true,
  id: admin.id,
  login_name: admin.login_name,
  role: admin.role,
  is_active: admin.is_active,
  password_hash_ok_for_admin2026: admin.password_hash === sha256("admin2026"),
  token_sub: payload?.sub,
  token_role: payload?.role,
});

process.exit(0);
