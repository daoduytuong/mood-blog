import { z } from "zod";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";

// Mood bắt buộc (1/6); caption tuỳ chọn.
export const momentSchema = z.object({
  caption: z.string().max(2000).optional(),
  mood: z.enum(MOOD_CODES as [MoodCode, ...MoodCode[]]),
});
