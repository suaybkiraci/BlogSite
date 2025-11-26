"use client";
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, CheckCircle } from 'lucide-react';
import { contactAPI, ContactMessageOut } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessageOut[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      contactAPI.getAll(token)
        .then(setMessages)
        .catch(() => toast.error('Messages could not be loaded'))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleMarkRead = async (id: number) => {
    if (!token) return;
    try {
      await contactAPI.markRead(id, token);
      setMessages(messages.map(m => m.id === id ? { ...m, is_read: 1 } : m));
      toast.success('Marked as read');
    } catch {
      toast.error('Something went wrong');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute requireAdmin>
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          Loading...
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireAdmin>
      <div className="py-10">
        <main className="mx-auto max-w-5xl space-y-8 px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[36px] border border-white/60 bg-white/80 p-8 shadow-[0_35px_110px_rgba(15,23,42,0.2)] backdrop-blur-2xl dark:border-white/15 dark:bg-slate-950/60"
          >
            <h1 className="text-3xl font-semibold text-foreground">Contact messages</h1>
            <p className="mt-2 text-muted-foreground">
              {messages.length} messages • {messages.filter((m) => !m.is_read).length} unread
            </p>
          </motion.div>

          <div className="space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`card p-6 ${!msg.is_read ? 'border-primary/50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{msg.name}</h3>
                      {!msg.is_read && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <a href={`mailto:${msg.email}`} className="text-sm text-primary hover:underline">
                      {msg.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock size={14} />
                    {new Date(msg.created_at).toLocaleDateString('en-US')}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground whitespace-pre-wrap wrap-break-word overflow-wrap-anywhere">{msg.message}</p>

                {!msg.is_read && (
                  <button
                    onClick={() => handleMarkRead(msg.id)}
                    className="mt-4 text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <CheckCircle size={14} />
                    Mark as read
                  </button>
                )}
              </motion.div>
            ))}

            {messages.length === 0 && (
              <div className="card p-12 text-center text-muted-foreground">
                <Mail size={48} className="mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}