"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

const HIDDEN_NAVBAR_ROUTES = ["/blog/new", "/blog/edit"];

export default function ConditionalNavbar() {
  const pathname = usePathname() || "";
  
  const shouldHide = HIDDEN_NAVBAR_ROUTES.some((route) => {
    if (route === "/blog/edit") {
      return pathname.startsWith("/blog/edit/");
    }
    return pathname === route;
  });

  if (shouldHide) return null;
  return <Navbar />;
}