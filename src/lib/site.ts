// URL gốc của site cho metadataBase / OG / sitemap (absolute URL).
export function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://mood-blog-phi.vercel.app";
}
