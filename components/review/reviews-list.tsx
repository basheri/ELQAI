"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReviewCard } from "@/components/review/review-card";
import { VERDICT_LABELS } from "@/types";
import type { Review, User } from "@/types";

interface Props {
  reviews: (Review & { reviewedBy: User | null })[];
  search?: string;
  verdict?: string;
  nextCursor: string | null;
}

export function ReviewsList({ reviews, search, verdict, nextCursor }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search ?? "");

  function applyFilters(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    params.delete("cursor");
    router.push(`/?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    applyFilters({ search: searchValue || undefined });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">المراجعات</h2>
        <Link href="/reviews/new">
          <Button>مراجعة جديدة</Button>
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="بحث باسم المقرر أو رمزه..."
            className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="outline" size="sm">
            بحث
          </Button>
        </form>

        <select
          value={verdict ?? ""}
          onChange={(e) =>
            applyFilters({ verdict: e.target.value || undefined })
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">جميع الأحكام</option>
          {Object.entries(VERDICT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg text-muted-foreground">
            {search || verdict ? "لا توجد نتائج مطابقة" : "لا توجد مراجعات بعد"}
          </p>
          {!search && !verdict && (
            <p className="mt-2 text-sm text-muted-foreground">
              ابدأ بإنشاء مراجعة جديدة لمقرر إلكتروني
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Cursor-based pagination */}
      {nextCursor && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("cursor", nextCursor);
              router.push(`/?${params.toString()}`);
            }}
          >
            عرض المزيد
          </Button>
        </div>
      )}
    </div>
  );
}
