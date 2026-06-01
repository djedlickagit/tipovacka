import bcrypt from "bcryptjs";
import { query } from "./db.js";

const password = "admin2026";
const hash = await bcrypt.hash(password, 10);

await query(`
  UPDATE users
  SET 
    login_name = 'admin',
    password_hash = ?,
    pin_hash = NULL,
    role = 'admin',
    is_active = 1
  WHERE login_name = 'admin'
     OR LOWER(name) = 'admin'
     OR role = 'admin'
`, [hash]);

console.log("Admin heslo resetováno.");
console.log("Login: admin");
console.log("Heslo: admin2026");

process.exit(0);
