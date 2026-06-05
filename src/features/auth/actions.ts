"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface SignInState {
  error: string | null;
}

// Chỉ chấp nhận path nội bộ (chống open-redirect).
function safeReturnTo(value: string): string {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

export async function signIn(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const returnTo = safeReturnTo(String(formData.get("returnTo") ?? "/"));

  if (!email || !password) {
    return { error: "Bạn nhập email và mật khẩu giúp mình nhé." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Log nguyên nhân thật ra terminal dev (để gỡ lỗi); UI vẫn giữ giọng dịu.
    console.error("[signIn] auth error:", error.status, error.code, error.message);
    return { error: "Thông tin chưa đúng, thử lại nhé." };
  }

  redirect(returnTo);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
