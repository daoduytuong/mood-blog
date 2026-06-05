import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
