// Tạm thời hand-write theo schema (Story 1.3). Khi đã link Supabase project, thay bằng:
//   npm run gen:types   (supabase gen types typescript --linked > src/lib/db/types.ts)
import type { MoodCode } from "@/lib/moods";

export type PostType = "khoanh_khac" | "goc_doc" | "hanh_trinh";

export interface MediaItem {
  // Khoảnh khắc-ảnh: { path, w, h, blurDataURL? }
  path?: string;
  w?: number;
  h?: number;
  blurhash?: string;
  blurDataURL?: string; // preview ~16px (data URL) cho blur-up next/image
  // Khoảnh khắc-video: { provider:'vimeo', video_id, poster_url }
  provider?: "vimeo";
  video_id?: string;
  poster_url?: string;
  // Hành trình: mỗi phần tử media = 1 "chặng" (entry), thêm 2 field dưới
  date?: string; // YYYY-MM-DD (giờ VN, do client gửi)
  note?: string; // ghi chú ngắn của chặng
}

export interface PostRow {
  id: string;
  author_id: string;
  type: PostType;
  mood: MoodCode;
  caption: string | null;
  excerpt: string | null;
  link_url: string | null;
  media: MediaItem[];
  slug: string;
  is_published: boolean;
  created_at: string;
}

export interface HeartRow {
  post_id: string;
  anon_id: string;
  created_at: string;
}

// View công khai (migration 0010): chỉ tổng tim, KHÔNG lộ anon_id.
export interface HeartCountRow {
  post_id: string;
  heart_count: number;
}

export interface Database {
  public: {
    Tables: {
      posts: {
        Row: PostRow;
        Insert: {
          author_id: string;
          type: PostType;
          mood: MoodCode;
          slug: string;
          caption?: string | null;
          excerpt?: string | null;
          link_url?: string | null;
          media?: MediaItem[];
          is_published?: boolean;
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<PostRow, "id" | "author_id">>;
        Relationships: [];
      };
      hearts: {
        Row: HeartRow;
        Insert: { post_id: string; anon_id: string; created_at?: string };
        Update: Partial<HeartRow>;
        Relationships: [];
      };
    };
    Views: {
      heart_counts: { Row: HeartCountRow; Relationships: [] };
    };
    Functions: { [_ in never]: never };
    Enums: {
      post_type: PostType;
      mood_code: MoodCode;
    };
    CompositeTypes: { [_ in never]: never };
  };
}
