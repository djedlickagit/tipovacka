import bcrypt from "bcryptjs";
import { query } from "./db.js";

const rows = await query(`
  SELECT id, name, login_name, role, is_active, password_hash
  FROM users
  WHERE login_name = 'admin' OR role = 'admin' OR LOWER(name) = 'admin'
  LIMIT 1
`);

if (!rows.length) {
  console.log("Admin nenalezen.");
  process.exit(1);
}

const admin = rows[0];

console.log({
  id: admin.id,
  name: admin.name,
  login_name: admin.login_name,
  role: admin.role,
  is_active: admin.is_active,
  has_password_hash: !!admin.password_hash,
  hash_start: admin.password_hash ? admin.password_hash.substring(0, 10) : null,
});

const ok = await bcrypt.compare("admin2026", admin.password_hash || "");

console.log("bcrypt compare admin2026:", ok ? "OK" : "NESOUHLASÍ");

process.exit(0);
