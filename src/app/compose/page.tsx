import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ComposeForm } from "@/features/compose/ComposeForm";

export const dynamic = "force-dynamic";

export default async function ComposePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?returnTo=/compose");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-container px-4.5 py-12">
      <h1
        className="mb-1 text-2xl font-medium text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Ghi lại một điều
      </h1>
      <p className="mb-8 text-sm text-text-muted">
        Một khoảnh khắc của bạn, hoặc một điều hay bạn muốn giữ lại.
      </p>
      <ComposeForm />
    </main>
  );
}
