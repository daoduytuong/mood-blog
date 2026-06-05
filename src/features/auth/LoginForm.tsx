"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "./actions";

const initial: SignInState = { error: null };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-muted">Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-text-muted">Mật khẩu</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-border bg-surface px-3 py-2 text-text outline-none focus:border-accent"
        />
      </label>

      {state.error && (
        <p className="text-sm text-text-muted" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-accent px-4 py-2 text-on-accent transition-opacity disabled:opacity-60"
      >
        {pending ? "Đang vào…" : "Đăng nhập"}
      </button>
    </form>
  );
}
