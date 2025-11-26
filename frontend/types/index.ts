export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_approved: boolean;
  is_banned: boolean;
  created_at: string;
  approved_at: string | null;
  profile_image?: string | null;
}

export interface AdminUser extends User {
  blog_count: number;
}
