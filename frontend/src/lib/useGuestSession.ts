"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { getToken, saveToken } from "./session";

export function useGuestSession(): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (getToken() !== null) {
      setReady(true);
      return;
    }
    api
      .guestSession()
      .then((session) => {
        saveToken(session.access_token);
        setReady(true);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not start a session"));
  }, []);

  return { ready, error };
}
