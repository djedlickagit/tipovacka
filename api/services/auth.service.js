import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "tipovacka-ms-2026-dev-secret";

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

export async function hashSecret(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return bcrypt.hash(raw, 10);
}

export async function verifySecret(value, storedHash) {
  const raw = String(value || "").trim();
  const hash = String(storedHash || "").trim();

  if (!raw || !hash) return false;

  // Nová bezpečnější varianta: bcrypt
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(raw, hash);
  }

  // Zpětná kompatibilita se staršími patchi, kde se ukládal sha256.
  if (/^[a-f0-9]{64}$/i.test(hash)) {
    return sha256(raw) === hash.toLowerCase();
  }

  return false;
}

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      id: user.id,
      name: user.name,
      login_name: user.login_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "14d" }
  );
}

export function verifyToken(token) {
  try {
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function publicUser(user = {}) {
  return {
    id: user.id,
    name: user.name,
    login_name: user.login_name,
    email: user.email,
    role: user.role,
    is_active: Number(user.is_active) === 1,
    has_pin: Boolean(user.pin_hash),
    has_password: Boolean(user.password_hash),
    tips_count: Number(user.tips_count || 0),
    points: Number(user.points || 0),
    exact_count: Number(user.exact_count || 0),
    result_count: Number(user.result_count || 0),
  };
}
