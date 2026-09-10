"use client";

import { useActionState, useState, useTransition } from "react";
import { updatePostAction, type ComposeState } from "./actions";
import { MOOD_CODES, type MoodCode } from "@/lib/moods";
import { Button } from "@/components/ui/Button";
import { MoodChip } from "@/components/ui/Chip";
import { FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const initial: ComposeState = { error: null };

export interface EditFormProps {
  id: string;
  slug: string;
  type: "khoanh_khac" | "goc_doc" | "hanh_trinh";
  initialMood: MoodCode;
  initialCaption: string;
  initialExcerpt: string;
  initialLinkUrl: string;
}

// Story 1.7 — sửa nội dung + tâm trạng. KHÔNG đổi ảnh, KHÔNG đổi loại, KHÔNG đổi slug.
// Hành trình sửa như Khoảnh khắc (caption + mood); chặng quản ở JourneyEntryList.
export function EditForm({
  id,
  slug,
  type,
  initialMood,
  initialCaption,
  initialExcerpt,
  initialLinkUrl,
}: EditFormProps) {
  const [state, action] = useActionState(updatePostAction, initial);
  const [pending, startTransition] = useTransition();
  const [mood, setMood] = useState<MoodCode>(initialMood);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError ?? state.error;
  const isMoment = type !== "goc_doc"; // hanh_trinh: chỉ caption + mood, như moment

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", id);
    fd.set("slug", slug);
    fd.set("type", type);
    fd.set("mood", mood);

    if (!isMoment) {
      const linkUrl = String(fd.get("linkUrl") ?? "").trim();
      const excerpt = String(fd.get("excerpt") ?? "").trim();
      if (!linkUrl && !excerpt)
        return setLocalError("Thêm một link hoặc đoạn trích nhé.");
    }
    startTransition(() => action(fd));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {!isMoment && (
        <div className="flex flex-col gap-4">
          <Input
            type="url"
            name="linkUrl"
            defaultValue={initialLinkUrl}
            placeholder="Dán link (tuỳ chọn)"
          />
          <Textarea
            name="excerpt"
            rows={3}
            defaultValue={initialExcerpt}
            placeholder="Một đoạn bạn tâm đắc…"
            className="italic"
            style={{ fontFamily: "var(--font-serif)" }}
          />
        </div>
      )}

      {/* Caption / cảm nhận */}
      <Textarea
        name="caption"
        rows={3}
        defaultValue={initialCaption}
        placeholder={
          type === "goc_doc"
            ? "Vì sao bạn thích điều này?"
            : type === "hanh_trinh"
              ? "Hành trình này là gì? (vd: Tập gym)"
              : "Hôm nay bạn thấy thế nào?"
        }
        style={{ fontFamily: "var(--font-serif)" }}
      />

      {/* Tâm trạng */}
      <div>
        <p className="mb-2 text-sm text-text-muted">Tâm trạng</p>
        <div className="flex flex-wrap gap-2">
          {MOOD_CODES.map((code) => (
            <MoodChip
              key={code}
              code={code}
              selected={mood === code}
              onClick={() => setMood(code)}
            />
          ))}
        </div>
      </div>

      {error && <FormError>{error}</FormError>}

      <div className="flex items-center gap-4">
        <Button type="submit" loading={pending} loadingLabel="Đang lưu…">
          Lưu thay đổi
        </Button>
        <a
          href={`/m/${slug}`}
          className="text-sm text-text-muted hover:text-text"
        >
          Huỷ
        </a>
      </div>
    </form>
  );
}
