"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  MessageSquareText,
  Instagram,
  Github,
  Linkedin,
  Mail,
  Code2,
  Briefcase,
  BookOpen,
  PenSquare,
} from "lucide-react";

const KaggleIcon = () => (
  <img src="/kaggle.svg" alt="Kaggle" className="h-5 w-5" />
);

const socialLinks = [
  { href: "https://github.com/suaybkiraci", label: "GitHub", icon: Github },
  { href: "https://linkedin.com/in/muhammed-suayib-kiraci-428648274", label: "LinkedIn", icon: Linkedin },
  { href: "mailto:msuaybkiraci@gmail.com", label: "Email", icon: Mail },
  { href: "https://instagram.com/suaybkiraci", label: "Instagram", icon: Instagram },
  { href: "https://kaggle.com/suayb1", label: "Kaggle", icon: KaggleIcon },
];

export default function Home() {
  const { user, initialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const quickActions = useMemo(() => {
    const actions = [
      {
        href: "/chat",
        label: "Chat with AI",
        description: "Chat with AI for instant insights",
        icon: MessageSquareText,
        accent: "from-primary/50 via-primary/5 to-transparent",
      },
      {
        href: "/blog/new",
        label: "Write a blog",
        description: "Share your thoughts with everyone",
        icon: PenSquare,
        accent: "from-emerald-400/40 via-emerald-200/10 to-transparent",
      },
      {
        href: "/blog",
        label: "Browse blogs",
        description: "Read all blog posts",
        icon: BookOpen,
        accent: "from-indigo-400/40 via-indigo-200/10 to-transparent",
      },
    ];

    return actions;
  }, []);

  if (!initialized || isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-full border border-white/30 px-4 py-2 backdrop-blur">
          Loading...
        </motion.div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="py-10">
        <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:px-8">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="rounded-[46px] border border-border/60 bg-card/90 p-8 md:p-12 shadow-[0_50px_120px_rgba(15,23,42,0.25)] backdrop-blur-3xl transition-colors dark:shadow-[0_55px_130px_rgba(4,12,30,0.55)]"
          >
            <div className="space-y-6 text-foreground">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Welcome back, <span className="text-primary">{user?.username}</span>
              </h1>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group relative overflow-hidden rounded-[30px] glass-card p-6 shadow-[0_25px_60px_rgba(15,23,42,0.15)] transition hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.accent} opacity-0 transition group-hover:opacity-100`} />
                  <div className="relative z-10 flex items-start gap-4">
                    <span className="glass-chip flex h-12 w-12 items-center justify-center rounded-2xl text-primary">
                      <action.icon size={20} />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{action.label}</p>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="grid gap-6 md:grid-cols-2"
          >
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="py-10">
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid gap-10 rounded-[48px] glass-card p-8 shadow-[0_50px_140px_rgba(15,23,42,0.25)] transition-colors md:grid-cols-[1.05fr_0.95fr]"
        >
          <div className="space-y-6 text-foreground">
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Personal Portfolio of <span className="text-primary">Şuayb Kiracı</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Hello, I am Şuayb. I’m a full-stack developer with a strong interest in Python-based web development. I enjoy designing efficient backend systems, building modern frontends, and experimenting with artificial intelligence..
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/CV2025.pdf"
                download="CV2025.pdf"
                className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg transition hover:-translate-y-0.5"
              >
                Download CV
              </Link>
              <Link
                href="/blog"
                className="glass-chip inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-foreground transition hover:-translate-y-0.5 hover:border-primary/60"
              >
                Explore the blog
              </Link>
            </div>
          </div>

          <div className="relative mx-auto flex h-72 w-72 items-center justify-center rounded-[40px] glass-card p-3 shadow-[0_40px_120px_rgba(15,23,42,0.25)]">
            <div className="relative h-full w-full overflow-hidden rounded-[32px] glass-card">
              <img
                src="https://avatars.githubusercontent.com/suaybkiraci"
                alt="Suayb Kiraci"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {socialLinks.map((item) => (
            <motion.a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -4 }}
              className="group inline-flex items-center gap-2 glass-chip rounded-full px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/60"
            >
              <item.icon size={18} className="text-muted-foreground group-hover:text-primary" />
              <span>{item.label}</span>
            </motion.a>
          ))}
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <motion.div whileHover={{ y: -6 }} className="group card relative overflow-hidden p-8 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Code2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Tech Stack</h3>
              <div className="mt-4 flex flex-wrap gap-2">

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-2.5 py-1.5"
                  title="Django"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.146 0h3.924v18.166c-2.013.382-3.491.535-5.096.535-4.791 0-7.288-2.166-7.288-6.32 0-4.002 2.65-6.6 6.753-6.6.637 0 1.121.05 1.707.203zm0 9.143a3.894 3.894 0 00-1.325-.204c-1.988 0-3.134 1.223-3.134 3.365 0 2.09 1.096 3.236 3.109 3.236.433 0 .79-.025 1.35-.102V9.142zM21.314 6.06v9.098c0 3.134-.229 4.638-.917 5.937-.637 1.249-1.478 2.039-3.211 2.905l-3.644-1.733c1.733-.815 2.574-1.53 3.109-2.625.56-1.121.739-2.421.739-5.835V6.059h3.924zM17.39.021h3.924v4.026H17.39z" />
                  </svg>
                  <span className="text-xs font-medium">Django</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-teal-500/20 bg-teal-500/10 px-2.5 py-1.5"
                  title="FastAPI"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.375 0 0 5.375 0 12c0 6.627 5.375 12 12 12 6.626 0 12-5.373 12-12 0-6.625-5.373-12-12-12zm-.624 21.62v-7.528H7.19L13.203 2.38v7.528h4.029L11.376 21.62z" />
                  </svg>
                  <span className="text-xs font-medium">FastAPI</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-pink-500/20 bg-pink-500/10 px-2.5 py-1.5"
                  title=".NET"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 8.77h-2.468v7.565h-1.425V8.77h-2.462V7.53H24zm-6.852 7.565h-4.821V7.53h4.63v1.24h-3.205v2.494h2.953v1.234h-2.953v2.604h3.396zm-6.708 0H8.882L4.78 9.863a2.896 2.896 0 01-.258-.51h-.036c.032.189.048.592.048 1.21v5.772H3.157V7.53h1.659l3.965 6.32c.167.261.275.442.323.54h.024c-.04-.233-.06-.629-.06-1.185V7.529h1.372zm-8.703-.693a.868.868 0 01-.869.869.868.868 0 01-.868-.869.868.868 0 01.868-.868.868.868 0 01.869.868z" />
                  </svg>
                  <span className="text-xs font-medium">.NET</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1.5"
                  title="React"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 10.11c1.03 0 1.87.84 1.87 1.89 0 1-.84 1.85-1.87 1.85S10.13 13 10.13 12c0-1.05.84-1.89 1.87-1.89M7.37 20c.63.38 2.01-.2 3.6-1.7-.52-.59-1.03-1.23-1.51-1.9a22.7 22.7 0 01-2.4-.36c-.51 2.14-.32 3.61.31 3.96m.71-5.74l-.29-.51c-.11.29-.22.58-.29.86.27.06.57.11.88.16l-.3-.51m6.54-.76l.81-1.5-.81-1.5c-.3-.53-.62-1-.91-1.47C13.17 9 12.6 9 12 9c-.6 0-1.17 0-1.71.03-.29.47-.61.94-.91 1.47L8.57 12l.81 1.5c.3.53.62 1 .91 1.47.54.03 1.11.03 1.71.03.6 0 1.17 0 1.71-.03.29-.47.61-.94.91-1.47M12 6.78c-.19.22-.39.45-.59.72h1.18c-.2-.27-.4-.5-.59-.72m0 10.44c.19-.22.39-.45.59-.72h-1.18c.2.27.4.5.59.72M16.62 4c-.62-.38-2 .2-3.59 1.7.52.59 1.03 1.23 1.51 1.9.82.08 1.63.2 2.4.36.51-2.14.32-3.61-.32-3.96m-.7 5.74l.29.51c.11-.29.22-.58.29-.86-.27-.06-.57-.11-.88-.16l.3.51m1.45-7.05c1.47.84 1.63 3.05 1.01 5.63 2.54.75 4.37 1.99 4.37 3.68s-1.83 2.93-4.37 3.68c.62 2.58.46 4.79-1.01 5.63-1.46.84-3.45-.12-5.37-1.95-1.92 1.83-3.91 2.79-5.38 1.95-1.46-.84-1.62-3.05-1-5.63-2.54-.75-4.37-1.99-4.37-3.68s1.83-2.93 4.37-3.68c-.62-2.58-.46-4.79 1-5.63 1.47-.84 3.46.12 5.38 1.95 1.92-1.83 3.91-2.79 5.37-1.95M17.08 12c.34.75.64 1.5.89 2.26 2.1-.63 3.28-1.53 3.28-2.26 0-.73-1.18-1.63-3.28-2.26-.25.76-.55 1.51-.89 2.26M6.92 12c-.34-.75-.64-1.5-.89-2.26-2.1.63-3.28 1.53-3.28 2.26 0 .73 1.18 1.63 3.28 2.26.25-.76.55-1.51.89-2.26m9 2.26l-.3.51c.31-.05.61-.1.88-.16-.07-.28-.18-.57-.29-.86l-.29.51m-2.89 4.04c1.59 1.5 2.97 2.08 3.59 1.7.64-.35.83-1.82.32-3.96-.77.16-1.58.28-2.4.36-.48.67-.99 1.31-1.51 1.9M8.08 9.74l.3-.51c-.31.05-.61.1-.88.16.07.28.18.57.29.86l.29-.51m2.89-4.04C9.38 4.2 8 3.62 7.37 4c-.63.35-.82 1.82-.31 3.96a22.7 22.7 0 012.4-.36c.48-.67.99-1.31 1.51-1.9z" />
                  </svg>
                  <span className="text-xs font-medium">React</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-500/20 bg-slate-500/10 px-2.5 py-1.5"
                  title="Next.js"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.5725 0c-.1763 0-.3098.0013-.3584.0067-.0516.0053-.2159.021-.3636.0328-3.4088.3073-6.6017 2.1463-8.624 4.9728C1.1004 6.584.3802 8.3666.1082 10.255c-.0962.659-.108.8537-.108 1.7474s.012 1.0884.108 1.7476c.652 4.506 3.8591 8.2919 8.2087 9.6945.7789.2511 1.6.4223 2.5337.5255.3636.04 1.9354.04 2.299 0 1.6117-.1783 2.9772-.577 4.3237-1.2643.2065-.1056.2464-.1337.2183-.1573-.0188-.0139-.8987-1.1938-1.9543-2.62l-1.919-2.592-2.4047-3.5583c-1.3231-1.9564-2.4117-3.556-2.4211-3.556-.0094-.0026-.0187 1.5787-.0235 3.509-.0067 3.3802-.0093 3.5162-.0516 3.596-.061.115-.108.1618-.2064.2134-.075.0374-.1408.0445-.495.0445h-.406l-.1078-.068a.4383.4383 0 01-.1572-.1712l-.0493-.1056.0053-4.703.0067-4.7054.0726-.0915c.0376-.0493.1174-.1125.1736-.143.0962-.047.1338-.0517.5396-.0517.4787 0 .5584.0187.6827.1547.0353.0377 1.3373 1.9987 2.895 4.3608a10760.433 10760.433 0 004.7344 7.1706l1.9002 2.8782.096-.0633c.8518-.5536 1.7525-1.3418 2.4657-2.1627 1.5179-1.7429 2.4963-3.868 2.8247-6.134.0961-.6591.1078-.854.1078-1.7475 0-.8937-.012-1.0884-.1078-1.7476-.6522-4.506-3.8592-8.2919-8.2087-9.6945-.7672-.2487-1.5836-.42-2.4985-.5232-.169-.0176-1.0835-.0366-1.6123-.037z" />
                  </svg>
                  <span className="text-xs font-medium">Next.js</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1.5"
                  title="PostgreSQL"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.128 0c-.316 0-.617.018-.921.05-2.023.207-3.172 1.046-3.967 2.368-.897-1.035-1.928-1.759-3.635-2.018-.317-.049-.636-.074-.958-.074-2.023 0-3.937.916-5.253 2.51-.974 1.181-1.673 2.86-1.673 5.086 0 2.014.62 3.675 1.695 5.055.884 1.134 2.08 2.029 3.52 2.636-.006.17-.012.339-.012.51 0 1.367.264 2.666.735 3.854.643 1.614 1.63 2.997 2.865 4.03 1.235 1.033 2.707 1.766 4.335 2.135.317.072.637.114.96.127l.048.001c1.603 0 3.097-.73 4.227-2.062 1.13-1.332 1.803-3.192 1.803-5.273V8.177c0-1.938-.58-3.674-1.613-5.05C18.62 1.582 17.256.622 15.676.12c-.483-.12-.97-.12-1.548-.12zm.043 1.996c.416 0 .783.016 1.152.092 1.123.233 2.048.93 2.772 2.012.724 1.081 1.13 2.48 1.13 4.077v9.758c0 1.563-.48 2.917-1.272 3.85-.792.934-1.85 1.418-3.02 1.418-.191 0-.382-.014-.572-.042-1.27-.23-2.384-.8-3.342-1.617-.958-.817-1.766-1.914-2.306-3.201-.54-1.287-.813-2.758-.813-4.365 0-.46.02-.923.06-1.387.035-.403-.083-.805-.332-1.126-.249-.321-.607-.544-1.001-.624-1.13-.235-2.048-.93-2.772-2.012-.724-1.081-1.13-2.48-1.13-4.077 0-1.765.514-3.117 1.272-4.036 1.036-1.255 2.48-1.985 4.027-1.985.224 0 .447.018.668.053 1.27.23 2.384.8 3.342 1.617.958.817 1.766 1.914 2.306 3.201.54 1.287.813 2.758.813 4.365 0 .46-.02.923-.06 1.387-.035.403.083.805.332 1.126.249.321.607.544 1.001.624z" />
                  </svg>
                  <span className="text-xs font-medium">PostgreSQL</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-blue-600/20 bg-blue-600/10 px-2.5 py-1.5"
                  title="TypeScript"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z" />
                  </svg>
                  <span className="text-xs font-medium">TypeScript</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1.5"
                  title="TensorFlow/Keras"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1.292 5.856L11.54 0v24l-4.095-2.378V7.603l-6.168 3.564.015-5.31zm21.43 5.311l-.014-5.31L12.46 0v24l4.095-2.378V14.87l3.092 1.788-.018-4.618-3.074-1.756V7.603l6.168 3.564z" />
                  </svg>
                  <span className="text-xs font-medium">TensorFlow/Keras</span>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5"
                  title="PyTorch"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.005 0L4.952 7.053a9.865 9.865 0 000 14.022 9.866 9.866 0 0014.022 0c3.984-3.9 3.986-10.205.085-14.023l-1.744 1.743c2.904 2.905 2.904 7.634 0 10.538s-7.634 2.904-10.538 0-2.904-7.634 0-10.538l4.647-4.646.582-.665zm3.568 3.899a1.327 1.327 0 00-1.327 1.327 1.327 1.327 0 001.327 1.328A1.327 1.327 0 0016.9 5.226 1.327 1.327 0 0015.573 3.9z" />
                  </svg>
                  <span className="text-xs font-medium">PyTorch</span>
                </motion.div>
              </div>
            </div>
          </motion.div>

          <motion.div whileHover={{ y: -6 }} className="group card relative overflow-hidden p-8 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 transition group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                <Briefcase size={24} />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Work Experience</h3>
              <div className="mt-6 space-y-4 text-sm">
                <div className="border-l-2 border-secondary/20 pl-4">
                  <div className="font-semibold text-foreground">Stoneity</div>
                  <div className="text-xs text-muted-foreground">2024 • Internship</div>
                  <p className="text-muted-foreground">.NET &amp; C# Web Backend Development</p>
                </div>
                <div className="border-l-2 border-secondary/20 pl-4">
                  <div className="font-semibold text-foreground">Perapole</div>
                  <div className="text-xs text-muted-foreground">2025 • Internship</div>
                  <p className="text-muted-foreground">FastAPI and Next.js Full Stack Development</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}

