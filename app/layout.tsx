import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og.png", base).toString();

  return {
    metadataBase: base,
    title: "중2 과학 Ⅰ. 물질의 특성 | 인터랙티브 수업",
    description: "물질의 특성과 혼합물의 분리를 슬라이드, 가상실험, 교사용 수업노트로 배우는 수업 도구",
    icons: { icon: "/favicon.svg" },
    openGraph: {
      title: "중2 과학 Ⅰ. 물질의 특성",
      description: "슬라이드 · 가상실험 · 수업노트",
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "중2 과학 물질의 특성 수업 자료" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "중2 과학 Ⅰ. 물질의 특성",
      description: "슬라이드 · 가상실험 · 수업노트",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
