"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuthStore } from "@/store/authStore";

export default function Footer() {
  const year = new Date().getFullYear();
  const { user, token } = useAuthStore();
  const isAuthed = Boolean(user || token);
  return (
    <footer className="px-4 pb-6 pt-10 sm:px-6 transition-colors">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-border/60 bg-card/90 px-6 py-5 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-2xl transition-colors dark:shadow-[0_35px_90px_rgba(4,12,30,0.5)] sm:px-8">
          <div className="flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between transition-colors">
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground/80 transition-colors">Blog of Şuayb</p>
              <p className="text-sm font-semibold text-foreground">© {year}</p>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <Link href="/" className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:bg-card/80 hover:text-foreground">
                Home
              </Link>
              <Link href="/blog" className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:bg-card/80 hover:text-foreground">
                Blog
              </Link>
              <Link href="/contact" className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:bg-card/80 hover:text-foreground">
                Contact
              </Link>
              {isAuthed && (
                <>
                  <Link href="/chat" className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:bg-card/80 hover:text-foreground">
                    Chat
                  </Link>
                  <Link href="/profile" className="rounded-full px-4 py-1.5 text-muted-foreground transition hover:bg-card/80 hover:text-foreground">
                    Profile
                  </Link>
                </>
              )}
            </nav>

            <div className="flex items-center justify-center gap-3">
              {user?.role === 'admin' && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Admin</span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
