"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { signIn, type SignInState } from "./actions";

const initial: SignInState = { error: null };

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [state, formAction, pending] = useActionState(signIn, initial);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />

      <Field label="Email">
        <Input type="email" name="email" autoComplete="email" required />
      </Field>

      <Field label="Mật khẩu">
        <Input
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {state.error && <FormError>{state.error}</FormError>}

      <Button
        type="submit"
        className="mt-2"
        loading={pending}
        loadingLabel="Đang vào…"
      >
        Đăng nhập
      </Button>
    </form>
  );
}
