#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = process.cwd();
const apiPath = path.join(root, "web", "src", "api.js");

if (!fs.existsSync(apiPath)) {
  console.error(`Soubor nenalezen: ${path.relative(root, apiPath)}`);
  process.exit(1);
}

const apiJs = `const configuredApiBase = import.meta.env.VITE_API_URL;

export const API_BASE = (configuredApiBase && String(configuredApiBase).trim()
  ? String(configuredApiBase).trim()
  : "/api"
).replace(/\\/+$/, "");

export function getToken() {
  return localStorage.getItem("tipovacka_token") || "";
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("tipovacka_token", token);
  } else {
    localStorage.removeItem("tipovacka_token");
  }
}

export async function apiFetch(pathValue, options = {}) {
  const token = getToken();
  const cleanPath = String(pathValue || "").startsWith("/")
    ? String(pathValue || "")
    : "/" + String(pathValue || "");
  const url = API_BASE + cleanPath;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error("Nepodařilo se spojit s aplikací. Zkus stránku obnovit nebo to prosím zkus později.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    if (response.status === 401) {
      setToken("");
    }

    const message = typeof data === "string"
      ? data
      : data?.error || data?.message || "Chyba aplikace " + response.status;

    throw new Error(message);
  }

  return data;
}
`;

fs.writeFileSync(apiPath, apiJs, "utf8");
console.log("OK: web/src/api.js opraveno pro Vite build.");
