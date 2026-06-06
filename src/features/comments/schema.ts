import { z } from "zod";

// Tên dành riêng cho chủ nhà — khách không được tự khai (badge thật vẫn enforce server-side,
// đây chỉ để tránh gây hiểu nhầm về thị giác).
const RESERVED = ["tác giả", "tac gia", "admin", "quản trị", "quan tri"];

export const commentSchema = z.object({
  authorName: z
    .string()
    .trim()
    .min(1, "Cho mình xin một cái tên nhé.")
    .max(40, "Tên hơi dài rồi (≤40 ký tự).")
    .refine(
      (n) => !RESERVED.includes(n.toLowerCase()),
      "Tên này để dành cho chủ nhà rồi nhé.",
    ),
  body: z
    .string()
    .trim()
    .min(1, "Viết đôi lời đã nhé.")
    .max(500, "Đôi lời thôi nhé (≤500 ký tự)."),
});

// Trả lời của tác giả: chỉ kiểm nội dung (tên/badge do server quyết).
export const replyBodySchema = z
  .string()
  .trim()
  .min(1, "Viết đôi lời đã nhé.")
  .max(500, "Đôi lời thôi nhé (≤500 ký tự).");

export type CommentInput = z.infer<typeof commentSchema>;
