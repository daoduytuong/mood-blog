"use client";

import { useEffect, useState } from "react";

// Đổi sáng/tối. FOUC đã chống bằng inline script ở layout (đặt class .dark trước paint).
// Render initial `dark=false` (khớp SSR) rồi đồng bộ sau mount -> không hydration mismatch.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ class .dark (do inline script đặt trước paint), tránh hydration mismatch
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Chuyển nền sáng" : "Chuyển nền tối"}
      className="grid h-9 w-9 place-items-center rounded-full border border-border text-text transition-colors hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
