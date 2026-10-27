const TOKEN_KEY = "photo-to-stl.token";

export function getToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
