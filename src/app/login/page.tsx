import { LoginForm } from "@/features/auth/LoginForm";

// Next 16: searchParams là async -> phải await.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-sm px-4.5 py-24">
      <h1
        className="text-2xl font-medium text-text"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Đăng nhập
      </h1>
      <p className="mt-2 mb-8 text-sm text-text-muted">
        Không gian này dành cho bạn.
      </p>
      <LoginForm returnTo={returnTo ?? "/"} />
    </main>
  );
}
