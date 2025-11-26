'use client';

import { useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { authAPI } from '@/lib/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, setUser, setToken, setLoading, logout } = useAuthStore();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useLayoutEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecking(false);
      router.replace('/login');
      return;
    }

    authAPI
      .getMe()
      .then((res) => {
        setUser(res.data);
        setToken(token);
        setLoading(false);
        setError(null);
        setChecking(false);
      })
      .catch((err) => {
        setLoading(false);
        const detail = err.response?.data?.detail;
        if (detail) {
          setError(detail);
          setChecking(false);
        } else {
          localStorage.removeItem('token');
          setChecking(false);
          router.replace('/login');
        }
      });
  }, [router, setLoading, setToken, setUser]);

  useLayoutEffect(() => {
    if (!user) return;
    if (requireAdmin && user.role !== 'admin') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Required for admin role check
      setError('Only administrators can access this page.');
      setChecking(false);
    }
  }, [requireAdmin, user]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <button
          className="btn-outline"
          onClick={() => {
            logout();
            router.replace('/');
          }}
        >
          Go back home
        </button>
      </div>
    );
  }

  if (!user && typeof window !== 'undefined' && localStorage.getItem('token')) {
     // Still loading user data
     return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
