"use client";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => { initialize(); }, [initialize]);

  if (!initialized) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{children}</motion.div>;
}