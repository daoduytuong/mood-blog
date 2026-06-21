import type { Metadata, Viewport } from "next";
import { Playfair_Display, Be_Vietnam_Pro } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import { AuthorNav } from "@/components/AuthorNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { env } from "@/env";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "khoảnh khắc của tôi",
  description:
    "Một khoảng lặng để ghi lại ảnh, nhạc và câu chuyện theo tâm trạng.",
};

export const viewport: Viewport = {
  themeColor: "#F4EEE2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${playfair.variable} ${beVietnam.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()",
          }}
        />
        {/* Header dính + kính mờ: luôn có lối về, không che nội dung. */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-container items-center justify-between px-4.5 py-4">
            <Link href="/" className="font-serif text-text">
              khoảnh khắc của tôi
            </Link>
            <div className="flex items-center gap-3">
              <AuthorNav />
              <ThemeToggle />
            </div>
          </div>
        </header>
        {children}
        {/* Analytics Plausible (Story 2.6): không cookie → không cần consent popup,
            không định danh người xem. Chỉ nạp khi đã đặt domain (Vercel Production). */}
        {env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
          <Script
            defer
            strategy="afterInteractive"
            data-domain={env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN}
            src={env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js"}
          />
        )}
      </body>
    </html>
  );
}
