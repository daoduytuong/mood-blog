import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import Link from "next/link";
import { AuthorNav } from "@/components/AuthorNav";
import "./globals.css";

// Lora (serif) — giọng của cảm xúc: lời viết, tiêu đề, trích dẫn.
const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

// Inter (sans) — giọng của giao diện: nút, nhãn, metadata.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "khoảnh khắc của tôi",
  description:
    "Một khoảng lặng để ghi lại ảnh, nhạc và câu chuyện theo tâm trạng.",
};

export const viewport: Viewport = {
  themeColor: "#F2F6F8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${lora.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Header dính + kính mờ: luôn có lối về, không che nội dung (light-only). */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/75 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-container items-center justify-between px-4.5 py-4">
            <Link href="/" className="font-serif text-text">
              khoảnh khắc của tôi
            </Link>
            <AuthorNav />
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
