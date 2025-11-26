"use client";

import { usePathname } from "next/navigation";

export default function ConditionalBackdrop() {
  const pathname = usePathname() || "";
  
  // Blog sayfalarında backdrop efektlerini gizle
  const isBlogPage = pathname.startsWith("/blog");
  
  if (isBlogPage) return null;
  
  return (
    <>
      <div className="app-backdrop" aria-hidden />
      <div className="page-mesh" aria-hidden />
      <div className="app-grid" aria-hidden />
      <div className="noise" aria-hidden />
    </>
  );
}


