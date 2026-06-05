const rawApiBase = import.meta.env.VITE_API_URL || "/api";

export const API_BASE = rawApiBase.replace(/\/$/, "");

export function getToken() {
  return localStorage.getItem("tipovacka_token") || "";
}

export function setToken(token) {
  if (token) localStorage.setItem("tipovacka_token", token);
  else localStorage.removeItem("tipovacka_token");
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const normalizedPath = path.startsWith("/") ? path : "/" + path;
  const url = API_BASE + normalizedPath;

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
    if (response.status === 401) setToken("");

    const message = typeof data === "string"
      ? data
      : data?.error || data?.message || "Chyba aplikace " + response.status;

    throw new Error(message);
  }

  return data;
}
