import axios from 'axios';
import type { AdminUser, User } from '@/types';
const API_URL = 'https://api.suayb.xyz';
const APPROVE_SEGMENT = 'approve';
const UNAPPROVE_SEGMENT = 'unapprove';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  
  getMe: () => api.get('/auth/me'),
};

export const geminiAPI = {
  generate: (data: { prompt: string; temperature?: number; max_tokens?: number }) =>
    api.post('/gemini/generate', data),
  
  chat: (data: { messages: Array<{ role: string; content: string }>; temperature?: number }) =>
    api.post('/gemini/chat', data),
};

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

export interface ContactMessageOut extends ContactMessage {
  id: number;
  created_at: string;
  is_read: number;
}

export const contactAPI = {
  async send(data: ContactMessage) {
    const res = await fetch(`${API_URL}/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return res.json();
    
  },

  async getAll(token: string): Promise<ContactMessageOut[]> {
    const res = await fetch(`${API_URL}/contact/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    return res.json();
  },

  async markRead(id: number, token: string) {
    const res = await fetch(`${API_URL}/contact/${id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
  },
};

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  cover_image?: string;
  is_published: boolean;
  is_approved: boolean;
  views: number;
  author_id: number;
  created_at: string;
  updated_at: string;
  // tags: BlogTag[];
  attachments: BlogAttachment[];
}


export interface BlogAttachment {
  id: number;
  filename: string;
  file_url: string;
  file_type?: string;
  file_size?: number;
}

export interface BlogPostCreate {
  title: string;
  content: string;
  excerpt?: string | null;
  cover_image?: string | null;
  is_published: boolean;
}

type BlogListOptions = {
  skip?: number;
  limit?: number;
  publishedOnly?: boolean;
  token?: string;
};

export interface BlogComment {
  id: number;
  post_id: number;
  content: string;
  author_id: number;
  author_username: string;
  created_at: string;
}

export interface BlogCommentCreate {
  content: string;
}

export const blogAPI = {
  async list(options: BlogListOptions = {}) {
    const {
      skip = 0,
      limit = 10,
      publishedOnly = true,
      token,
    } = options;
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
      published_only: publishedOnly.toString(),
    });
    const headers: Record<string, string> = {};
    if (token){
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/blog/?${params}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch blogs');
    return res.json();
  },

  async get(slug: string, token?: string): Promise<BlogPost> {
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/blog/${slug}`, { headers });
    if (!res.ok) throw new Error('Failed to fetch blog');
    return res.json();
  },

  async getById(id: number, token: string): Promise<BlogPost> {
    const res = await fetch(`${API_URL}/blog/id/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch blog');
    return res.json();
  },

  async create(data: BlogPostCreate, token: string) {
    const res = await fetch(`${API_URL}/blog/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create blog');
    return res.json();
  },

  async update(id: number, data: Partial<BlogPostCreate>, token: string) {
    const res = await fetch(`${API_URL}/blog/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update blog');
    return res.json();
  },

  async delete(id: number, token: string) {
    const res = await fetch(`${API_URL}/blog/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete blog');
    return res.json();
  },

  // Moderation actions
  async approveBlog(id: number, token: string) {
    const res = await fetch(`${API_URL}/blog/${id}/${APPROVE_SEGMENT}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to ${APPROVE_SEGMENT} blog`);
    return res.json();
  },

  async unapproveBlog(id: number, token: string) {
    const res = await fetch(`${API_URL}/blog/${id}/${UNAPPROVE_SEGMENT}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Failed to ${UNAPPROVE_SEGMENT} blog`);
    return res.json();
  },

  // Upload
  async uploadImage(file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/upload/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload image');
    return res.json();
  },

  async uploadFile(file: File, token: string) {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/upload/file`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },

  // Tags (Disabled)
  // async listTags(): Promise<BlogTag[]> {
  //   const res = await fetch(`${API_URL}/blog/tags/`);
  //   if (!res.ok) throw new Error('Failed to fetch tags');
  //   return res.json();
  // },

  // async createTag(name: string, token: string): Promise<BlogTag> {
  //   const res = await fetch(`${API_URL}/blog/tags/?name=${encodeURIComponent(name)}`, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${token}` },
  //   });
  //   if (!res.ok) throw new Error('Failed to create tag');
  //   return res.json();
  // },
  async listComments(post_id: number): Promise<BlogComment[]> {
    const res = await fetch(`${API_URL}/blog/${post_id}/comments`, {
    });
    if (!res.ok) throw new Error('Failed to fetch comments');
    return res.json();
  },

  async createComment(post_id: number, content: string, token: string): Promise<BlogComment> {
    const data = { content };
    const res = await fetch(`${API_URL}/blog/${post_id}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return res.json();
  },

  async deleteComment(post_id: number, comment_id: number, token: string): Promise<void> {
    const res = await fetch(`${API_URL}/blog/${post_id}/comments/${comment_id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete comment');
  },
};

// Unsplash proxy endpoint
export interface UnsplashPhoto {
  id: string;
  description?: string;
  alt_description?: string;
  width: number;
  height: number;
  color?: string;
  urls: {
    thumb: string;
    small: string;
    regular: string;
    full: string;
  };
  user: {
    name?: string;
    username?: string;
    profile_image?: string;
    links?: string;
  };
  links: {
    html?: string;
  };
}

export interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export const unsplashAPI = {
  async search(query: string, page = 1, perPage = 15): Promise<UnsplashSearchResponse> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
    });

    const res = await fetch(`${API_URL}/unsplash/search?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to search Unsplash');
    }
    return res.json();
  },
};

export const userAPI = {
  async uploadProfileImage(file: File, token: string): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/upload/profile-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to upload profile image');
    }
    return res.json();
  },
};

export const adminAPI = {
  getUsers: () => api.get<AdminUser[]>('/admin/users'),
  approveUser: (userId: number) => api.post(`/admin/users/${userId}/approve`),
  banUser: (userId: number) => api.post(`/admin/users/${userId}/ban`),
  unbanUser: (userId: number) => api.post(`/admin/users/${userId}/unban`),
  getUserBlogs: (userId: number) => api.get<BlogPost[]>(`/admin/users/${userId}/blogs`),
};