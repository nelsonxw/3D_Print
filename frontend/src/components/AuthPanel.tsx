"use client";

import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { saveToken } from "@/lib/session";

type Mode = "login" | "register";

type AuthPanelProps = {
  onAuthenticated: () => void;
};

export function AuthPanel({ onAuthenticated }: AuthPanelProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = (accessToken: string) => {
    saveToken(accessToken);
    onAuthenticated();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = mode === "login" ? await api.login(email, password) : await api.register(email, password);
      finish(session.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const continueAsGuest = async () => {
    setBusy(true);
    setError(null);
    try {
      finish((await api.guestSession()).access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start guest session");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
      <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
        {(["login", "register"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`flex-1 rounded-md py-1.5 ${mode === option ? "bg-white shadow-sm" : "text-slate-500"}`}
          >
            {option === "login" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-sky-600 py-2 font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        or
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={continueAsGuest}
        disabled={busy}
        className="w-full rounded-lg border border-slate-300 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        Continue as guest
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
