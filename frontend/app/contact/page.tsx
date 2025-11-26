"use client";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, User, MessageSquare, Send } from 'lucide-react';
import { contactAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await contactAPI.send(formData);
      toast.success('Message sent! I will get back to you soon.');
      setFormData({ name: '', email: '', message: '' });
    } catch {
      toast.error('Message could not be sent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-10">
      <main className="mx-auto max-w-4xl space-y-10 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-[40px] border border-border/60 bg-card/90 p-10 text-center shadow-[0_40px_120px_rgba(15,23,42,0.22)] backdrop-blur-2xl dark:shadow-[0_50px_130px_rgba(4,12,30,0.55)]"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail size={28} />
          </div>
          <h1 className="mt-4 text-4xl font-semibold text-foreground">Get in touch</h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="card p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <User size={16} className="text-primary" />
                Your Name
              </label>
              <input
                type="text"
                required
                className="text-field w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Mail size={16} className="text-primary" />
                Email
              </label>
              <input
                type="email"
                required
                className="text-field w-full"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="flex items-center gap-2 text-sm font-medium mb-2">
                <MessageSquare size={16} className="text-primary" />
                Your Message
              </label>
              <textarea
                required
                rows={6}
                className="text-field w-full resize-none"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSubmitting ? (
                'Sending...'
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center text-sm text-muted-foreground"
        >
        </motion.div>
      </main>
    </div>
  );
}