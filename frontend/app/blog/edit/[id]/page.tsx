"use client";
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { blogAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import TiptapEditor from '@/components/TiptapEditor';
import toast from 'react-hot-toast';
import { Upload, X, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';

interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  is_published: boolean;
  is_approved: boolean;
  // tags: BlogTag[];
}

export default function EditBlogPage() {
  const router = useRouter();
  const params = useParams();
  const postId = parseInt(params.id as string);
  const { token, user } = useAuthStore();
  
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  // const [selectedTags, setSelectedTags] = useState<number[]>([]);
  // const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    blogAPI.getById(postId, token)
      .then((post: BlogPost) => {
        setContent(post.content);
        setExcerpt(post.excerpt || '');
        setCoverImage(post.cover_image || '');
        setIsPublished(post.is_published);
        // setSelectedTags(post.tags.map(t => t.id));
      })
      .catch(() => {
        toast.error('Failed to load post');
        router.push('/blog');
      })
      .finally(() => setLoading(false));

    // blogAPI.listTags().then(setTags).catch(() => {});
  }, [user, router, postId, token]);

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setUploading(true);
    try {
      const result = await blogAPI.uploadImage(file, token);
      const url = `http://localhost:8000${result.url}`;
      setCoverImage(url);
      toast.success('Cover image uploaded!');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorImageUpload = async (file: File): Promise<string> => {
    if (!token) throw new Error('Not authenticated');
    
    try {
      const result = await blogAPI.uploadImage(file, token);
      return `http://localhost:8000${result.url}`;
    } catch {
      throw new Error('Upload failed');
    }
  };

  const extractTitle = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const firstP = doc.querySelector('p');
    return firstP?.textContent || '';
  };

  const handleSubmit = async (publish: boolean) => {
    if (!token) return;
    
    const title = extractTitle(content);
    
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim()) {
      toast.error('Content is required');
      return;
    }

    setSaving(true);

    try {
      await blogAPI.update(
        postId,
        {
          title,
          content,
          excerpt: excerpt || null,
          cover_image: coverImage || null,
          is_published: publish,
          // tag_ids: selectedTags.length > 0 ? selectedTags : [],
        },
        token
      );
      
      toast.success(publish ? 'Blog updated! Waiting for approval.' : 'Draft saved!');
      router.push('/blog');
    } catch (error: unknown) {
      console.error('Failed to update blog:', error);
      const msg = (error as Error)?.message || 'Failed to update blog';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 z-20 bg-background transition-colors overflow-y-auto">
        <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-card/90 shadow-[0_25px_70px_rgba(15,23,42,0.18)] backdrop-blur-2xl transition-colors dark:shadow-[0_32px_80px_rgba(4,12,30,0.48)]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft size={20} />
                Back to blog
              </Link>
              <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Edit</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="glass-chip rounded-full p-2 text-muted-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
                title="Ayarlar"
              >
                <Settings size={20} />
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving}
                className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary disabled:opacity-60"
              >
                Save draft
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={saving}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-primary dark:text-primary-foreground"
              >
                {isPublished ? 'Update' : 'Publish'}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-24 pb-12">
          <div className="mx-auto max-w-3xl px-6">
            <TiptapEditor content={content} onChange={setContent} onImageUpload={handleEditorImageUpload} />
          </div>
        </div>

        {/* Settings Sidebar */}
        <AnimatePresence>
          {showSettings && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40"
                onClick={() => setShowSettings(false)}
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 z-50 h-full w-96 overflow-y-auto border-l border-border/60 bg-card/95 shadow-[0_30px_80px_rgba(15,23,42,0.25)] backdrop-blur-2xl transition-colors dark:shadow-[0_30px_80px_rgba(4,12,30,0.52)]"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Post Settings</h2>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="p-2 hover:bg-accent rounded-lg transition"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Cover Image */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Cover Image</label>
                    {coverImage ? (
                      <div className="relative">
                        <img src={coverImage} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                        <button
                          onClick={() => setCoverImage('')}
                          className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-full hover:bg-destructive/80 shadow-lg"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition">
                        <Upload size={32} className="text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">
                          {uploading ? 'Uploading...' : 'Click to upload cover'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleCoverImageUpload}
                          disabled={uploading}
                        />
                      </label>
                    )}
                  </div>

                  {/* Excerpt */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Excerpt</label>
                    <textarea
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      rows={4}
                      maxLength={300}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Brief description (max 300 chars)..."
                    />
                    <p className="text-xs text-muted-foreground mt-1">{excerpt.length}/300</p>
                  </div>

                  {/* Tags (Disabled) */}
                  {/* <div>
                    <label className="block text-sm font-medium mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            setSelectedTags(prev =>
                              prev.includes(tag.id)
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm transition ${
                            selectedTags.includes(tag.id)
                              ? 'bg-primary text-white'
                              : 'bg-muted hover:bg-muted/80'
                          }`}
                        >
                          {tag.name}
                        </button>
                      ))}
                      {tags.length === 0 && (
                        <p className="text-sm text-muted-foreground">No tags available</p>
                      )}
                    </div>
                  </div> */}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
