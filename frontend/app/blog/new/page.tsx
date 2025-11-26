"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { blogAPI } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import ProtectedRoute from '@/components/ProtectedRoute';
import TiptapEditor from '@/components/TiptapEditor';
import toast from 'react-hot-toast';
import { Save, Upload, X, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export default function NewBlogPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [coverImage, setCoverImage] = useState('');
  // const [selectedTags, setSelectedTags] = useState<number[]>([]);
  // const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // blogAPI.listTags().then(setTags).catch(() => {});
  }, []);

  const generateFileName = (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    return fileName;
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = generateFileName(file);

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (uploadError) {
          console.error('Supabase Upload Error Detail:', uploadError);
          throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      console.log('Supabase Public URL:', publicUrl);
      setCoverImage(publicUrl);
      toast.success('Cover image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleEditorImageUpload = async (file: File): Promise<string> => {
    try {
      const fileName = generateFileName(file);

      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file);

      if (uploadError) {
          console.error('Supabase Editor Upload Error Detail:', uploadError);
          throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);

      console.log('Supabase Editor Public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Editor upload error:', error);
      throw new Error('Upload failed');
    }
  };

  // Extract only the headline text, do not mutate the rest of the content
  const extractTitle = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Try the first H1 first
    const h1 = doc.querySelector('h1');
    if (h1?.textContent?.trim()) {
      return h1.textContent.trim();
    }

    // Sonra ilk paragraf
    const firstP = doc.querySelector('p');
    if (firstP?.textContent?.trim()) {
      return firstP.textContent.trim();
    }

    // Fall back to the first non-empty line of raw text if needed
    const raw = doc.body.textContent || '';
    const firstLine = raw
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.length > 0);

    return firstLine || '';
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

    setLoading(true);

    try {
      await blogAPI.create({
        title,
        content,
        excerpt: excerpt || null,
        cover_image: coverImage || null,
        is_published: publish,
        // tag_ids: selectedTags,
      }, token);
      
      toast.success(publish ? 'Blog published! Waiting for approval.' : 'Draft saved!');
      router.push('/blog');
    } catch (error: unknown) {
      console.error('Failed to create blog:', error);
      const msg = (error as Error)?.message || 'Failed to create blog';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      {/* MOBİL UYARI EKRANI */}
      <div className="flex flex-col items-center justify-center min-h-screen text-center md:hidden px-4 bg-background fixed inset-0 z-50">
        <div className="bg-muted/30 p-6 rounded-full mb-6">
          <Smartphone size={48} className="text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Masaüstü Görünümü Gerekli</h2>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          Gelişmiş blog editörü mobil cihazlarda desteklenmemektedir. En iyi deneyim için lütfen bilgisayardan giriş yapın.
        </p>
        <Link 
          href="/blog" 
          className="inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-sm transition-all hover:bg-foreground/90"
        >
          Bloglara Dön
        </Link>
      </div>

      <div className="hidden md:block">
      <div className="fixed inset-0 z-20 bg-background transition-colors overflow-y-auto">
        <header className="fixed left-0 right-0 top-0 z-40 border-b border-border/60 bg-card/90 shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur-2xl transition-colors dark:shadow-[0_28px_70px_rgba(4,12,30,0.45)]">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
                <ArrowLeft size={20} />
                Back to blog
              </Link>
              <span className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Draft</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                Settings
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="glass-chip rounded-full px-5 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-2">
                  <Save size={16} />
                  Save
                </span>
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 dark:bg-primary dark:text-primary-foreground"
              >
                Publish
              </button>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-16">
          <TiptapEditor content={content} onChange={setContent} onImageUpload={handleEditorImageUpload} />
        </main>

        {/* Settings Sidebar */}
        <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="fixed top-0 right-0 z-50 h-full w-96 overflow-y-auto border-l border-border/60 bg-card/95 shadow-[0_30px_80px_rgba(15,23,42,0.2)] backdrop-blur-2xl transition-colors dark:shadow-[0_28px_80px_rgba(4,12,30,0.5)]"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Post Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-accent rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Cover Image</label>
                {coverImage ? (
                  <div className="relative">
                    <img src={coverImage} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                    <button
                      onClick={() => setCoverImage('')}
                      className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition">
                    <Upload size={32} className="text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Upload cover image</span>
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

              <div>
                <label className="block text-sm font-medium mb-2">Excerpt</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={4}
                  className="text-field resize-none"
                  placeholder="Short description..."
                  maxLength={300}
                />
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
                      className={`px-3 py-1 rounded-full text-sm transition ${
                        selectedTags.includes(tag.id)
                          ? 'bg-primary text-white'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div> */}
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
      </div>
    </ProtectedRoute>
  );
}