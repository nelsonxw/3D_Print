"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearToken, getToken } from "@/lib/session";

export function NavBar() {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(getToken() !== null);
  }, []);

  const signOut = () => {
    clearToken();
    router.push("/");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-slate-900">
          Photo<span className="text-sky-600">&rarr;</span>STL
        </Link>
        {signedIn && (
          <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
            <Link href="/upload" className="hover:text-sky-700">
              New model
            </Link>
            <Link href="/jobs" className="hover:text-sky-700">
              My models
            </Link>
            <button type="button" onClick={signOut} className="hover:text-red-600">
              Sign out
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
