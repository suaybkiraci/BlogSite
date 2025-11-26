"use client";
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { blogAPI, BlogComment, BlogCommentCreate } from '@/lib/api';
import { Calendar, Eye, Tag, ArrowLeft, Edit, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import hljs from 'highlight.js';

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  is_published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  tags?: Array<{ id: number; name: string; slug: string }>;
  author_username?: string;
  author_id?: number;
  attachments: Array<{
    id: number;
    filename: string;
    file_url: string;
    file_type?: string;
    file_size?: number;
  }>;
  
}

export default function BlogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuthStore();
  const contentRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [newComment, setNewComment] = useState<BlogCommentCreate>({ content: '' });

  useEffect(() => {
    // If the user is an admin, fetch with a token so drafts are visible
    const fetchPost = async () => {
      try {
        let postData;
        if (token) {
        postData = await blogAPI.get(slug, token);
        } else {
          postData = await blogAPI.get(slug);
        }
        setPost(postData);
      } catch (error) {
        console.error('Failed to load post:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPost();
  }, [slug, user, token]);

  useEffect(() => {
    if (!post || !contentRef.current) return;
    contentRef.current
      .querySelectorAll('pre code')
      .forEach((block) => hljs.highlightElement(block as HTMLElement));
  }, [post]);

  useEffect(() => {
    if (!post) return;
    blogAPI.listComments(post.id).then(setComments).catch(() => {});
  }, [post]);

  const handleDelete = async () => {
    if (!token || !post || !confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await blogAPI.delete(post.id, token);
      toast.success('Post deleted');
      router.push('/blog');
    } catch {
      toast.error('Failed to delete post');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !post || !newComment.content.trim()) return;

    try {
      const comment = await blogAPI.createComment(post.id, newComment.content, token);
      setComments([...comments, comment]);
      setNewComment({ content: '' });
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!token || !post || !confirm('Are you sure you want to delete this comment?')) return;

    try {
      await blogAPI.deleteComment(post.id, commentId, token);
      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-20 bg-white flex items-center justify-center text-muted-foreground">
        <div className="animate-pulse rounded-full border border-white/40 px-4 py-2 backdrop-blur">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 z-20 bg-white flex flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Blog post not found</p>
        <Link href="/blog" className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background shadow-lg">
          <ArrowLeft size={16} />
          Back to blog
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-20 bg-background transition-colors overflow-y-auto pt-24">
      <main className="py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {user?.role === 'admin'|| user?.id===post.author_id && (
            <div className="mb-6 flex items-center justify-end gap-2">
              <Link
                href={`/blog/edit/${post.id}`}
                className="glass-chip rounded-full px-4 py-2 text-sm font-medium text-foreground transition hover:-translate-y-0.5 hover:border-primary hover:text-primary"
              >
                <span className="inline-flex items-center gap-2">
                  <Edit size={16} /> Edit
                </span>
              </Link>
              <button
                onClick={handleDelete}
                className="rounded-full border border-red-200/60 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-500/10 dark:border-red-500/40"
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={16} /> Delete
                </span>
              </button>
            </div>
          )}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Calendar size={16} />
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span className="inline-flex items-center gap-2">
                <Eye size={16} />
                {post.views} views
              </span>
              <span className="inline-flex items-center gap-2">
                <User size={16} />
                {post.author_username}
              </span>
            </div>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                  >
                    <Tag size={14} />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}

            <div className="medium-editor">
              <div
                className="ProseMirror"
                ref={contentRef}
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>

            {post.attachments && post.attachments.length > 0 && (
              <div className="pt-8">
                <h3 className="text-lg font-semibold text-foreground">Attachments</h3>
                <div className="mt-4 space-y-2">
                  {post.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={att.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/70 px-4 py-3 text-sm transition hover:-translate-y-0.5 dark:border-white/15 dark:bg-white/5"
                    >
                      <div>
                        <div className="font-medium text-foreground">{att.filename}</div>
                        <div className="text-muted-foreground">
                          {att.file_type?.toUpperCase()} • {att.file_size ? (att.file_size / 1024).toFixed(1) : '0'} KB
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Comments Section */}
            <div className="pt-12 border-t border-border/50">
              <h3 className="text-xl font-semibold mb-6">Comments ({comments.length})</h3>
              
              {user ? (
                <form onSubmit={handleCommentSubmit} className="mb-8">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <textarea
                        value={newComment.content}
                        onChange={(e) => setNewComment({ content: e.target.value })}
                        placeholder="Write a comment..."
                        className="w-full p-4 rounded-2xl bg-white/50 border border-border/50 focus:ring-2 focus:ring-primary/50 focus:border-primary transition resize-none dark:bg-white/5"
                        rows={3}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newComment.content.trim()}
                      className="self-end px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Post
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-6 rounded-2xl bg-muted/30 text-center">
                  <p className="text-muted-foreground">
                    Please <Link href="/login" className="text-primary hover:underline font-medium">log in</Link> to leave a comment.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="group relative p-6 rounded-2xl bg-white/30 border border-border/50 hover:border-border transition dark:bg-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <User size={16} />
                        </div>
                        <div>
                          <span className="font-medium block leading-none">{comment.author_username}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {(user?.role === 'admin' || user?.id === comment.author_id) && (
                        <button
                          onClick={() => handleCommentDelete(comment.id)}
                          className="p-2 text-muted-foreground hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                          title="Delete comment"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <p className="text-foreground/90 leading-relaxed pl-10 break-words">{comment.content}</p>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to share your thoughts!</p>
                )}
              </div>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
}
