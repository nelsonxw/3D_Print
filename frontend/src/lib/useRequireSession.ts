"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "./session";

export function useRequireSession(): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (getToken() === null) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  return ready;
}
