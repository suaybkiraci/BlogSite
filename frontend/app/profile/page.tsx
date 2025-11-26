"use client";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { User, Mail, Hash, Shield, Camera, Loader2 } from "lucide-react";
import { userAPI } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProfilePage() {
  const { user, token, setUser } = useAuthStore();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleProfileImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleProfileImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!token) {
      toast.error('Session not found');
      return;
    }
    setUploading(true);
    try {
      const updatedUser = await userAPI.uploadProfileImage(file, token);
      setUser(updatedUser);
      toast.success('Profile image updated');
    } catch (error: unknown) {
      console.error(error);
      toast.error((error as Error)?.message || 'Profile image not uploaded');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const initials = (user?.username || 'User').slice(0,2).toUpperCase();
  const profileImageUrl = useMemo(() => {
    if (!user?.profile_image) return null;
    if (user.profile_image.startsWith('http')) return user.profile_image;
    const normalizedBase = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    return `${normalizedBase}${user.profile_image.startsWith('/') ? '' : '/'}${user.profile_image}`;
  }, [user?.profile_image]);

  return (
    <ProtectedRoute>
      <div className="py-10">
        <main className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6 lg:px-8">
          <motion.div
            className="glass-card rounded-[40px] p-8 shadow-[0_40px_120px_rgba(15,23,42,0.2)] transition-colors dark:shadow-[0_45px_130px_rgba(4,12,30,0.55)] md:p-12"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row items-center md:items-center gap-10">
              <motion.div
                className="flex flex-col items-center text-center gap-5"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="relative h-48 w-48 rounded-full border border-border/60 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-1 shadow-[0_25px_70px_rgba(59,130,246,0.3)]">
                  <div className="h-full w-full overflow-hidden rounded-full border border-border/60 bg-card/95 transition-colors">
                    {profileImageUrl ? (
                      <Image
                        src={profileImageUrl}
                        alt="Profile"
                        fill
                        sizes="(max-width: 768px) 192px, 224px"
                        className="object-cover rounded-full"
                        priority
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full grid place-items-center rounded-full text-4xl font-semibold text-primary">
                        {initials}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 text-center">
                  <h1 className="text-3xl font-semibold text-foreground">{user?.username}</h1>
                  <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Shield size={14} /> {user?.role === 'admin' ? 'Admin' : 'Standard User'}
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleProfileImageClick}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary hover:text-primary disabled:translate-y-0 disabled:opacity-60"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    {uploading ? 'Uploading...' : 'Change photo'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>
              </motion.div>

              <motion.div
                className="flex-1 w-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-surface rounded-2xl p-5 text-foreground shadow-sm transition-colors">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <User size={14} /> Username
                    </span>
                    <span className="text-lg font-medium">{user?.username}</span>
                  </div>
                  <div className="glass-surface rounded-2xl p-5 text-foreground shadow-sm transition-colors">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Mail size={14} /> Email
                    </span>
                    <span className="text-lg font-medium break-all">{user?.email}</span>
                  </div>
                  <div className="glass-surface rounded-2xl p-5 text-foreground shadow-sm transition-colors sm:col-span-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                      <Hash size={14} /> ID
                    </span>
                    <span className="text-lg font-mono">{user?.id}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </main>
      </div>
    </ProtectedRoute>
  );
}