const rawApiBase =
  import.meta.env.VITE_API_URL || "http://localhost:5051/api";

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
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    throw new Error(
      `Nepodařilo se spojit s API (${API_BASE}). Zkontroluj, že běží backend na portu 5051.`
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : await response.text().catch(() => "");

  if (!response.ok) {
    if (response.status === 401) {
      setToken("");
    }

    const message =
      typeof data === "string"
        ? data
        : data?.error || data?.message || `API chyba ${response.status}`;

    throw new Error(message);
  }

  return data;
}
