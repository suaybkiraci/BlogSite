import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Footer from "@/components/Footer";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import ConditionalBackdrop from "@/components/ConditionalBackdrop";
import AuthProvider from "./providers/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Şuayb's Blog",
    template: "%s | Şuayb's Blog",
  },
  description: "Personal blog and portfolio sharing insights on web development, technology, and more.",
  keywords: ["blog", "web development", "technology", "programming", "portfolio"],
  authors: [{ name: "Şuayb" }],
  creator: "Şuayb",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://your-domain.com",
    title: "Şuayb's Blog",
    description: "Personal blog and portfolio sharing insights on web development, technology, and more.",
    siteName: "Şuayb's Blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Şuayb's Blog",
    description: "Personal blog and portfolio sharing insights on web development, technology, and more.",
    creator: "@yourhandle",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInit = `(() => { try { const t = localStorage.getItem('theme'); if (t === 'dark') { document.documentElement.classList.add('dark'); } else if (t === 'light') { document.documentElement.classList.remove('dark'); } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) { document.documentElement.classList.add('dark'); } } catch (_) {} })();`;
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <AuthProvider>
        <ConditionalBackdrop />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Toaster position="top-right" />
          <ConditionalNavbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </div>
        </AuthProvider>
      </body>
    </html>
  );
}
