"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { blogAPI } from '@/lib/api';
import { Tag, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { User } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image?: string;
  is_published: boolean;
  views: number;
  author_id: number;
  author_username: string;
  created_at: string;
  tags?: Array<{ id: number; name: string; slug: string }>;
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();

  const handleDelete = async (postId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || !confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await blogAPI.delete(postId, token);
      toast.success('Post deleted');
      setPosts(posts.filter(p => p.id !== postId));
    } catch {
      toast.error('Failed to delete post');
    }
  };

  useEffect(() => {
    // If the user is an admin load with a token so drafts are included
    const fetchPosts = blogAPI.list(token ? { token } : {});

    fetchPosts
      .then(setPosts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <div className="animate-pulse rounded-full border border-white/40 px-4 py-2 backdrop-blur">Loading blogs...</div>
      </div>
    );
  }

  const visiblePosts = posts.filter(
    (post) => post.is_published || post.author_id === user?.id
  );

  return (
    <div className="fixed inset-0 z-20 bg-background transition-colors overflow-y-auto py-10 pt-24">
      <main className="relative mx-auto flex max-w-4xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[40px] p-8 text-center shadow-[0_40px_140px_rgba(15,23,42,0.25)] transition-colors md:p-12"
        >
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">Blogs</h1>
          {user && (
            <div className="mt-6">
              <Link
                href="/blog/new"
                className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-lg transition hover:-translate-y-0.5 dark:bg-primary dark:text-primary-foreground"
              >
                <Plus size={18} />
                Write a blog
              </Link>
            </div>
          )}
        </motion.div>

        <div className="flex flex-col gap-0">
          {visiblePosts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group"
            >
              <div className="flex items-start gap-6 py-6 border-b border-gray-100 transition-colors dark:border-[#1f2a44]/60 dark:hover:bg-[#111f3e]/55 relative">
                {/* Content - Sol */}
                <div className="flex-1 min-w-0 relative pb-10">
                  <Link href={`/blog/${post.slug}`} className="block">
                    <h2 className="text-xl font-semibold text-foreground transition group-hover:text-primary mb-2 leading-snug">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {!post.is_published && (user?.role === 'admin' || user?.id===post.author_id) && (
                        <span className="rounded-full bg-yellow-500/20 px-2 py-1 font-medium text-yellow-700 dark:text-yellow-400">
                          Taslak
                        </span>
                      )}
                      
                      
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                            >
                              <Tag size={11} />
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                  {/* Yazar Bölümü - Minimal */}
                      {post.author_username && (
                        <div className="absolute bottom-0 left-0 ">
                        <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                          <User size={14} />
                        {post.author_username}
                        </span>
                        </div>
                      )}
                </div>

                {/* Cover Image ve Actions - Sağ */}
                <div className="flex-shrink-0 flex items-start gap-3">
                  {/* Actions - Sağ üst (sadece draft ise) */}
                  {user?.role === 'Admin'|| user?.id===post.author_id && (
                    <div className="flex flex-col items-center gap-1.5 pt-1">
                      <Link
                      href={`/blog/edit/${post.id}`}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition rounded-full hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-50 dark:hover:bg-[#1a2b52]/70"
                    >
                      <Edit size={14} />
                    </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDelete(post.id, e);
                        }}
                        className="p-1.5 text-red-500 hover:text-red-700 transition rounded-full hover:bg-red-50 dark:hover:bg-red-500/20 dark:hover:text-red-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  {/* Cover Image */}
                  {post.cover_image && (
                    <Link href={`/blog/${post.slug}`} className="flex-shrink-0">
                      <div className="relative w-48 h-28 overflow-hidden rounded-[8px]">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
