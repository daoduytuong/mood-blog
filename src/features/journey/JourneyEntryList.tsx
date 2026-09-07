"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { removeJourneyEntry } from "@/features/compose/actions";
import { formatPostDate } from "@/lib/date";
import {
  JourneyEntryEditor,
  type JourneyEntryItem,
} from "./JourneyEntryEditor";

export type { JourneyEntryItem };

// Quản lý chặng trong trang Sửa: liệt kê (mới nhất trước) + sửa/gỡ từng chặng.
// entries truyền theo thứ tự LƯU (cũ -> mới) để đánh số "Chặng N" đúng.
export function JourneyEntryList({
  postId,
  slug,
  entries,
}: {
  postId: string;
  slug: string;
  entries: JourneyEntryItem[];
}) {
  // Chặng đang mở form sửa (theo path — duy nhất trong media).
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const closeEditor = useCallback(() => setEditingPath(null), []);

  if (entries.length === 0)
    return (
      <p className="text-sm text-text-muted">
        Chưa có chặng nào — thêm chặng đầu tiên từ trang bài nhé.
      </p>
    );

  const newestFirst = entries
    .map((entry, i) => ({ entry, ordinal: i + 1 }))
    .reverse();

  return (
    <ul className="flex flex-col gap-3">
      {newestFirst.map(({ entry, ordinal }) => (
        <li
          key={entry.path}
          className="rounded-sm border border-border bg-surface p-2"
        >
          {editingPath === entry.path ? (
            <JourneyEntryEditor
              postId={postId}
              slug={slug}
              ordinal={ordinal}
              entry={entry}
              onDone={closeEditor}
              onCancel={closeEditor}
            />
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-border/40">
                <Image
                  src={entry.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text">
                  Chặng {ordinal}
                  {entry.date && (
                    <span className="text-text-muted"> · {formatPostDate(entry.date)}</span>
                  )}
                </p>
                {entry.note && (
                  <p className="truncate text-sm text-text-muted">{entry.note}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setEditingPath(entry.path)}
                className="px-2 text-sm text-accent underline-offset-2 transition-colors hover:underline"
              >
                Sửa
              </button>
              <form action={removeJourneyEntry}>
                <input type="hidden" name="id" value={postId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="path" value={entry.path} />
                <button
                  type="submit"
                  onClick={(e) => {
                    if (!window.confirm(`Gỡ chặng ${ordinal}? Ảnh sẽ bị xoá luôn nhé.`))
                      e.preventDefault();
                  }}
                  className="px-2 text-sm text-text-muted underline-offset-2 transition-colors hover:text-text hover:underline"
                >
                  Gỡ
                </button>
              </form>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
