'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ban,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  BookOpen,
  Mail,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { adminAPI, blogAPI, BlogPost } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { AdminUser } from '@/types';
import toast from 'react-hot-toast';

type Filter = 'all' | 'pending' | 'banned';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US');
};

type Tab = 'users' | 'blogs';

export default function AdminPage() {
  const { token } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allBlogs, setAllBlogs] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState<Filter>('pending');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userBlogs, setUserBlogs] = useState<BlogPost[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(false);
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data);
      setSelectedUser((prev) => {
        if (!prev) return null;
        return res.data.find((u) => u.id === prev.id) ?? null;
      });
    } catch {
      toast.error('Users could not be loaded');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchUserBlogs = async (userId: number) => {
    setLoadingBlogs(true);
    try {
      const res = await adminAPI.getUserBlogs(userId);
      setUserBlogs(res.data);
    } catch {
      toast.error('Posts could not be loaded');
    } finally {
      setLoadingBlogs(false);
    }
  };

  const fetchAllBlogs = async () => {
    if (!token) return;
    setLoadingBlogs(true);
    try {
      // Admin için token ile tüm blogları çek (approved olmayan da dahil)
      const res = await fetch('http://localhost:8000/blog/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch blogs');
      const blogs = await res.json();
      setAllBlogs(blogs);
    } catch (error) {
      console.error('Blog fetch error:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoadingBlogs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAllBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchUserBlogs(selectedUser.id);
    } else {
      setUserBlogs([]);
    }
  }, [selectedUser]);

  const filteredUsers = useMemo(() => {
    switch (filter) {
      case 'pending':
        return users.filter((u) => !u.is_approved && !u.is_banned);
      case 'banned':
        return users.filter((u) => u.is_banned);
      default:
        return users;
    }
  }, [filter, users]);

  const stats = useMemo(() => ({
    total: users.length,
    pending: users.filter((u) => !u.is_approved && !u.is_banned).length,
    banned: users.filter((u) => u.is_banned).length,
    totalBlogs: users.reduce((acc, user) => acc + user.blog_count, 0),
  }), [users]);

  const statHighlights: { label: string; value: number; icon: LucideIcon; tone: string; accent: string }[] = [
    {
      label: 'Total users',
      value: stats.total,
      icon: Users,
      tone: 'text-primary',
      accent: 'from-primary/40 via-primary/10 to-transparent',
    },
    {
      label: 'Pending approval',
      value: stats.pending,
      icon: CheckCircle2,
      tone: 'text-emerald-500',
      accent: 'from-emerald-400/40 via-emerald-200/20 to-transparent',
    },
    {
      label: 'Banned users',
      value: stats.banned,
      icon: Ban,
      tone: 'text-red-500',
      accent: 'from-red-400/40 via-red-200/20 to-transparent',
    },
    {
      label: 'Total blog posts',
      value: stats.totalBlogs,
      icon: BookOpen,
      tone: 'text-indigo-500',
      accent: 'from-indigo-400/40 via-indigo-200/20 to-transparent',
    },
  ];

  const handleApprove = async (userId: number) => {
    setActionUserId(userId);
    try {
      await adminAPI.approveUser(userId);
      toast.success('User approved');
      await fetchUsers();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Action failed';
      toast.error(msg);
    } finally {
      setActionUserId(null);
    }
  };

  const handleBanToggle = async (user: AdminUser) => {
    setActionUserId(user.id);
    try {
      if (user.is_banned) {
        await adminAPI.unbanUser(user.id);
        toast.success('Ban removed');
      } else {
        await adminAPI.banUser(user.id);
        toast.success('User banned');
      }
      await fetchUsers();
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Action failed';
      toast.error(msg);
    } finally {
      setActionUserId(null);
    }
  };

  const handleSelectUser = (user: AdminUser) => {
    setSelectedUser(user);
  };

  const handleDeleteBlog = async (postId: number) => {
    if (!token) {
      toast.error('Session token not found');
      return;
    }
    const confirmDelete = window.confirm('Are you sure you want to delete this blog post?');
    if (!confirmDelete) return;
    try {
      await blogAPI.delete(postId, token);
      toast.success('Blog deleted');
      setUserBlogs((prev) => prev.filter((post) => post.id !== postId));
      setAllBlogs((prev) => prev.filter((post) => post.id !== postId));
      await fetchUsers();
    } catch {
      toast.error('Failed to delete blog');
    }
  };

  const handleApproveBlog = async (postId: number) => {
    if (!token) return;
    try {
      await blogAPI.approveBlog(postId, token);
      toast.success('Blog approved!');
      setAllBlogs((prev) => prev.map(b => b.id === postId ? { ...b, is_approved: true } : b));
      setUserBlogs((prev) => prev.map(b => b.id === postId ? { ...b, is_approved: true } : b));
    } catch (error) {
      console.error('Approve error:', error);
      toast.error('Failed to approve blog: ' + (error as Error).message);
    }
  };

  const handleUnapproveBlog = async (postId: number) => {
    if (!token) return;
    try {
      await blogAPI.unapproveBlog(postId, token);
      toast.success('Blog approval removed');
      setAllBlogs((prev) => prev.map(b => b.id === postId ? { ...b, is_approved: false } : b));
      setUserBlogs((prev) => prev.map(b => b.id === postId ? { ...b, is_approved: false } : b));
    } catch (error) {
      console.error('Unapprove error:', error);
      toast.error('Failed to unapprove blog: ' + (error as Error).message);
    }
  };

  const pendingBlogs = useMemo(() => allBlogs.filter(b => !b.is_approved), [allBlogs]);
  const approvedBlogs = useMemo(() => allBlogs.filter(b => b.is_approved), [allBlogs]);

  const filterButtons: { label: string; value: Filter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Banned', value: 'banned' },
  ];

  return (
    <ProtectedRoute requireAdmin>
      <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
        <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
          <section className="space-y-8 rounded-[32px] border border-white/40 bg-white/80 px-6 py-10 shadow-[0_35px_90px_rgba(15,23,42,0.15)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground/80">Control center</p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Admin panel</h1>
                <p className="max-w-2xl text-muted-foreground">
                  Keep the community safe by moderating users and reviewing their content.
                </p>
              </div>
              <button
                onClick={() => { fetchUsers(); fetchAllBlogs(); }}
                className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-5 py-2 text-sm font-medium text-foreground shadow-[0_15px_40px_rgba(15,23,42,0.15)] transition hover:-translate-y-0.5 hover:shadow-[0_25px_60px_rgba(15,23,42,0.15)] disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-white/10 dark:text-white"
                disabled={loadingUsers || loadingBlogs}
              >
                <RefreshCw size={16} className={loadingUsers || loadingBlogs ? 'animate-spin' : ''} />
                {loadingUsers || loadingBlogs ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="flex gap-2 border-b border-border/40">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
                  activeTab === 'users'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Users size={16} className="inline mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('blogs')}
                className={`px-6 py-3 text-sm font-medium transition border-b-2 ${
                  activeTab === 'blogs'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <BookOpen size={16} className="inline mr-2" />
                Blogs ({pendingBlogs.length} pending)
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statHighlights.map((item) => (
                <motion.div
                  key={item.label}
                  whileHover={{ y: -6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                  className="group relative overflow-hidden rounded-2xl border border-white/40 bg-white/80 px-5 py-6 shadow-[0_20px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/40"
                >
                  <div
                    className={`absolute inset-0 bg-linear-to-br ${item.accent} opacity-0 transition duration-300 group-hover:opacity-90`}
                    aria-hidden
                  />
                  <div className="relative flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.7rem] uppercase tracking-[0.35em] text-muted-foreground/80">{item.label}</p>
                      <p className="mt-3 text-3xl font-semibold">{item.value}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-white/10 ${item.tone}`}>
                      <item.icon size={22} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {activeTab === 'users' && (
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[32px] border border-white/35 bg-white/80 px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35 sm:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Users</p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">Moderation queue</h2>
                  <p className="text-sm text-muted-foreground">Filter pending requests and update their status.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filterButtons.map((btn) => (
                    <button
                      key={btn.value}
                      onClick={() => setFilter(btn.value)}
                      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                        filter === btn.value
                          ? 'border-transparent bg-primary text-primary-foreground shadow-[0_12px_30px_rgba(59,130,246,0.35)]'
                          : 'border-white/60 bg-white/60 text-muted-foreground hover:text-foreground dark:border-white/15 dark:bg-white/10'
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingUsers ? (
                <div className="flex min-h-[260px] items-center justify-center text-muted-foreground">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="mt-10 rounded-2xl border border-dashed border-white/60 bg-white/60 px-6 py-12 text-center text-muted-foreground dark:border-white/20 dark:bg-white/5">
                  No entries found
                </div>
              ) : (
                <div className="relative mt-8 max-h-[34rem] overflow-y-auto pr-2">
                  <div
                    className="pointer-events-none absolute left-6 top-0 h-full w-px bg-gradient-to-b from-primary/30 via-primary/5 to-transparent"
                    aria-hidden
                  />
                  <div className="space-y-4">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectUser(user)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSelectUser(user);
                          }
                        }}
                        className={`relative rounded-2xl border px-5 py-4 pl-11 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                          selectedUser?.id === user.id
                            ? 'border-primary/60 bg-primary/5 shadow-[0_20px_50px_rgba(59,130,246,0.2)]'
                            : 'border-white/50 bg-white/70 hover:border-primary/40 hover:bg-primary/5 dark:border-white/20 dark:bg-white/5'
                        }`}
                      >
                        <span
                          className={`absolute left-4 top-6 h-2.5 w-2.5 rounded-full ${
                            selectedUser?.id === user.id
                              ? 'bg-primary ring-4 ring-primary/20'
                              : 'bg-muted-foreground/70 ring-4 ring-white/60 dark:ring-white/10'
                          }`}
                          aria-hidden
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground">{user.username}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                          {user.role === 'admin' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                              <ShieldCheck size={14} />
                              Admin
                            </span>
                          )}
                          {!user.is_approved && !user.is_banned && (
                            <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-yellow-700">Awaiting approval</span>
                          )}
                          {user.is_banned && (
                            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-600">Banned</span>
                          )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                        <span>Posts: {user.blog_count}</span>
                        <span>Joined: {formatDate(user.created_at)}</span>
                        {user.approved_at && <span>Approved: {formatDate(user.approved_at)}</span>}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {!user.is_approved && !user.is_banned && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(user.id);
                              }}
                              className="rounded-full bg-emerald-500/90 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                              disabled={actionUserId === user.id}
                            >
                              {actionUserId === user.id ? 'Approving...' : 'Approve'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBanToggle(user);
                            }}
                            className="rounded-full border border-white/60 px-4 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:text-white"
                            disabled={actionUserId === user.id}
                          >
                            {user.is_banned ? 'Unban' : 'Ban'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-white/35 bg-white/80 px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35 sm:px-8">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Details</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {selectedUser ? `${selectedUser.username} • Posts` : 'Select a user'}
                </h2>
              </div>
              {!selectedUser ? (
                <div className="mt-10 flex flex-col items-center gap-3 text-center text-muted-foreground">
                  <Users size={32} className="text-primary" />
                  <p>Pick a user on the left to review their posts.</p>
                  <p className="text-sm">Always check the content before approving it.</p>
                </div>
              ) : (
                <>
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-xl font-semibold text-primary">
                          {selectedUser.username?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{selectedUser.username}</p>
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail size={14} />
                            {selectedUser.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-medium">
                        {selectedUser.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-primary">
                            <ShieldCheck size={14} />
                            Admin
                          </span>
                        )}
                        {selectedUser.is_banned ? (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-600">Banned</span>
                        ) : selectedUser.is_approved ? (
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-600">Approved</span>
                        ) : (
                          <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-yellow-700">Awaiting approval</span>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} />
                        <span>Joined: {formatDate(selectedUser.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-emerald-500" />
                        <span>Approved: {selectedUser.approved_at ? formatDate(selectedUser.approved_at) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} />
                        <span>Post count: {selectedUser.blog_count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Ban size={14} className={selectedUser.is_banned ? 'text-red-500' : 'text-muted-foreground'} />
                        <span>Status: {selectedUser.is_banned ? 'Banned' : 'Active'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 border-t border-white/40 pt-6 dark:border-white/10">
                    {loadingBlogs ? (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">Loading posts...</div>
                    ) : userBlogs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/60 bg-white/60 px-6 py-10 text-center text-muted-foreground dark:border-white/20 dark:bg-white/5">
                        No posts found
                      </div>
                    ) : (
                      <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                        {userBlogs.map((post) => (
                          <div
                            key={post.id}
                            className="rounded-2xl border border-white/40 bg-white/80 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-foreground">{post.title}</p>
                                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <CalendarDays size={14} />
                                  {formatDate(post.created_at)} • {post.views} views
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!post.is_published && (
                                  <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-xs font-medium text-yellow-700">Draft</span>
                                )}
                                <button
                                  onClick={() => handleDeleteBlog(post.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200/70 text-red-500 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            {post.excerpt && (
                              <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
          )}

          {activeTab === 'blogs' && (
          <section className="rounded-[32px] border border-white/35 bg-white/80 px-6 py-8 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/35 sm:px-8">
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground/80">Blog management</p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">Approval queue</h2>
                <p className="text-sm text-muted-foreground">Review and approve blog posts from users</p>
              </div>

              {loadingBlogs ? (
                <div className="flex min-h-[260px] items-center justify-center text-muted-foreground">
                  Loading blogs...
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Pending Approval ({pendingBlogs.length})</h3>
                    {pendingBlogs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/60 bg-white/60 px-6 py-12 text-center text-muted-foreground dark:border-white/20 dark:bg-white/5">
                        No pending blogs
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingBlogs.map((post) => (
                          <div
                            key={post.id}
                            className="rounded-2xl border border-white/60 bg-white/60 px-5 py-4 dark:border-white/15 dark:bg-white/5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{post.title}</h4>
                                {post.excerpt && (
                                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDate(post.created_at)}</span>
                                  <span>•</span>
                                  <span>{post.views} views</span>
                                  {!post.is_published && (
                                    <>
                                      <span>•</span>
                                      <span className="text-yellow-600">Draft</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleApproveBlog(post.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-green-200/70 text-green-600 transition hover:bg-green-50 dark:border-green-500/30 dark:hover:bg-green-500/10"
                                  title="Approve"
                                >
                                  <CheckCircle2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBlog(post.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200/70 text-red-500 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">Approved ({approvedBlogs.length})</h3>
                    {approvedBlogs.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/60 bg-white/60 px-6 py-12 text-center text-muted-foreground dark:border-white/20 dark:bg-white/5">
                        No approved blogs
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[600px] overflow-y-auto">
                        {approvedBlogs.map((post) => (
                          <div
                            key={post.id}
                            className="rounded-2xl border border-white/60 bg-white/60 px-5 py-4 dark:border-white/15 dark:bg-white/5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground">{post.title}</h4>
                                {post.excerpt && (
                                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                                  <span>{formatDate(post.created_at)}</span>
                                  <span>•</span>
                                  <span>{post.views} views</span>
                                  {post.is_published && (
                                    <>
                                      <span>•</span>
                                      <span className="text-green-600">Published</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleUnapproveBlog(post.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-200/70 text-orange-600 transition hover:bg-orange-50 dark:border-orange-500/30 dark:hover:bg-orange-500/10"
                                  title="Remove approval"
                                >
                                  <Ban size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteBlog(post.id)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200/70 text-red-500 transition hover:bg-red-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}