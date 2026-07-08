const ACCESS_TOKEN_STORAGE_KEY = "ai-agent-platform.auth.access-token";

export function saveAccessToken(accessToken: string): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  } catch {
    // Storage can be unavailable in private browsing or locked-down environments.
  }
}

export function getAccessToken(): string | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearAccessToken(): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // Clearing best-effort storage should never block logout or restore cleanup.
  }
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
