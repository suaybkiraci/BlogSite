"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { useMemo, useState } from "react";
import { Menu, LogOut, UserCircle, MessageCircle, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
    const router = useRouter();
    const { logout, token, user } = useAuthStore();
    const isAuthed = Boolean(token || user);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [quickLinksOpen, setQuickLinksOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push("/");
    };

    const profileImage = useMemo(() => {
      if (!user?.profile_image) return null;
      if (user.profile_image.startsWith("http")) return user.profile_image;
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const normalized = base.endsWith("/") ? base.slice(0, -1) : base;
      return `${normalized}${user.profile_image.startsWith("/") ? "" : "/"}${user.profile_image}`;
    }, [user?.profile_image]);

    const initials = (user?.username || "U").slice(0, 2).toUpperCase();

    const navLinks: { href: string; label: string; authOnly?: boolean }[] = [
      { href: "/blog", label: "Blog" },
      { href: "/chat", label: "Chat", authOnly: true },
    ];

    const availableLinks = navLinks.filter((link) => !link.authOnly || isAuthed);

	return (
		<header className="sticky top-4 z-40 px-4 sm:px-6 transition-colors">
			<div className="mx-auto max-w-6xl">
				<div className="relative flex h-[4.25rem] items-center justify-between gap-4 rounded-[30px] border border-border/60 bg-card/90 px-4 shadow-[0_25px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-colors dark:shadow-[0_35px_90px_rgba(4,12,30,0.55)]">
					<div className="flex items-center gap-3">
						<div className="relative">
							<button
								onClick={() => setQuickLinksOpen((prev) => !prev)}
								className="text-foreground transition hover:-translate-y-0.5"
								aria-label="Open quick menu"
								aria-expanded={quickLinksOpen}
							>
								<img src="/favicon.png" alt="Menu" className="w-10 h-10 object-contain" />
							</button>
							<AnimatePresence>
								{quickLinksOpen && (
									<motion.div
										initial={{ opacity: 0, y: -6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -6 }}
										className="absolute left-0 mt-3 w-52 rounded-3xl border border-border/60 bg-card/95 p-2 text-sm text-muted-foreground shadow-2xl backdrop-blur-2xl transition-colors"
										onMouseLeave={() => setQuickLinksOpen(false)}
									>
										{availableLinks.map((item) => (
											<Link
												key={item.href}
												href={item.href}
												className="flex items-center justify-between rounded-2xl px-3 py-2 transition hover:bg-card/80 hover:text-foreground"
												onClick={() => setQuickLinksOpen(false)}
											>
												<span>{item.label}</span>
											</Link>
										))}
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<Link href="/" className="inline-flex flex-col leading-none">
							<span className="text-[0.65rem] tracking-[0.1em] text-muted-foreground">Blog of</span>
							<span className="text-lg font-semibold text-foreground">Şuayb</span>
						</Link>
					</div>

					

					<div className="flex items-center gap-3">
						{!isAuthed ? (
							<div className="flex items-center gap-2">
								<Link
									href="/login"
									className="rounded-full border border-border/60 px-3 py-1.5 text-xs sm:text-sm font-medium text-muted-foreground transition hover:border-primary/60 hover:text-foreground sm:px-4"
								>
									Log in
								</Link>
								<Link
									href="/register"
									className="rounded-full bg-foreground/90 px-4 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-semibold text-background shadow-lg transition hover:-translate-y-0.5 hover:bg-foreground"
								>
									Sign up
								</Link>
							</div>
						) : (
							<div className="relative">
								<button
									onClick={() => setProfileMenuOpen((prev) => !prev)}
									className="flex items-center gap-3 rounded-[22px] border border-border/60 bg-card/80 px-2 py-1.5 pr-4 text-left text-sm font-medium text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-card/70 hover:shadow-lg"
									aria-expanded={profileMenuOpen}
								>
									<div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
										{profileImage ? (
											<Image
												src={profileImage}
												alt="Profile"
												fill
												sizes="48px"
												className="object-cover"
												quality={100}
												unoptimized
											/>
										) : (
											<div className="grid h-full w-full place-items-center">{initials}</div>
										)}
									</div>
									<div className="hidden sm:flex flex-col leading-tight">
										<span className="text-sm font-semibold">{user?.username}</span>
										<span className="text-[0.65rem] uppercase tracking-[0.3em] text-muted-foreground">
											{user?.role === "admin" ? "Admin" : "Member"}
										</span>
									</div>
								</button>

								<AnimatePresence>
									{profileMenuOpen && (
										<motion.div
											initial={{ opacity: 0, y: -6 }}
											animate={{ opacity: 1, y: 0 }}
											exit={{ opacity: 0, y: -6 }}
											className="absolute right-0 mt-3 w-64 rounded-3xl border border-border/60 bg-card/95 p-3 text-sm text-muted-foreground shadow-2xl backdrop-blur-2xl transition-colors"
										>
											<div className="rounded-2xl border border-border/60 bg-card/85 p-3 text-foreground transition-colors">
												<p className="font-semibold">{user?.username}</p>
												<p className="text-xs text-muted-foreground truncate">{user?.email}</p>
											</div>
											<div className="mt-3 space-y-1">
												{user?.role === "admin" && (
													<>
														<Link
															href="/admin"
														className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-card/80"
															onClick={() => setProfileMenuOpen(false)}
														>
															<Shield size={16} /> Admin
														</Link>
														<Link
															href="/messages"
														className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-card/80"
															onClick={() => setProfileMenuOpen(false)}
														>
															<MessageCircle size={16} /> Messages
														</Link>
													</>
												)}
												<Link
													href="/profile"
													className="flex items-center gap-2 rounded-2xl px-3 py-2 transition hover:bg-card/80"
													onClick={() => setProfileMenuOpen(false)}
												>
													<UserCircle size={16} /> Profile
												</Link>
												<button
													onClick={() => {
														handleLogout();
														setProfileMenuOpen(false);
													}}
													className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-destructive transition hover:bg-destructive/10"
												>
													<LogOut size={16} /> Log out
												</button>
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

