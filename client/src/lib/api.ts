const getToken = () => localStorage.getItem("token");

export async function authFetch(url: string, options: RequestInit = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ message: res.statusText }));
    const err = Object.assign(new Error(errData.message || "Request failed"), errData);
    throw err;
  }
  return res.json();
}
