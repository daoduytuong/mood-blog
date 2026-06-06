import { z } from "zod";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";

// Mood bắt buộc (1/6); caption tuỳ chọn.
export const momentSchema = z.object({
  caption: z.string().max(2000).optional(),
  mood: z.enum(MOOD_CODES as [MoodCode, ...MoodCode[]]),
});

// Góc đọc: mood bắt buộc; cần ít nhất link HOẶC excerpt (kiểm "link or excerpt" ở action).
export const gocDocSchema = z.object({
  caption: z.string().max(2000).optional(), // cảm nhận
  excerpt: z.string().max(2000).optional(), // đoạn trích
  linkUrl: z.string().url().optional(),
  mood: z.enum(MOOD_CODES as [MoodCode, ...MoodCode[]]),
});
