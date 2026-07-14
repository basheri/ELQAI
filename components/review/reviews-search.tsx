"use client";

import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ReviewCard } from "@/components/review/review-card";
import { ReviewsEmptyState } from "@/components/review/reviews-empty-state";
import { listReviews } from "@/actions/review-list";
import { VERDICT_LABELS_AR } from "@/lib/review-display";

import type { Verdict } from "@prisma/client";
import type { ReviewSummary } from "@/types/review";

const VERDICT_OPTIONS = Object.keys(VERDICT_LABELS_AR) as Verdict[];
const ALL_VERDICTS = "__all__";

interface ReviewsSearchProps {
  initialReviews: ReviewSummary[];
  initialCursor?: string;
}

export function ReviewsSearch({
  initialReviews,
  initialCursor,
}: ReviewsSearchProps) {
  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(initialCursor);
  const [query, setQuery] = useState("");
  const [verdict, setVerdict] = useState<string>(ALL_VERDICTS);
  const [pending, startTransition] = useTransition();
  const [isSearching, setIsSearching] = useState(false);

  function doSearch(newQuery: string, newVerdict: string) {
    setIsSearching(true);
    startTransition(async () => {
      const result = await listReviews({
        query: newQuery || undefined,
        verdict:
          newVerdict !== ALL_VERDICTS
            ? (newVerdict as Verdict)
            : undefined,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.reviews) {
        setReviews(result.reviews);
        setCursor(result.nextCursor);
      }
      setIsSearching(false);
    });
  }

  function handleSearch() {
    doSearch(query, verdict);
  }

  function handleClear() {
    setQuery("");
    setVerdict(ALL_VERDICTS);
    doSearch("", ALL_VERDICTS);
  }

  function handleVerdictChange(value: string) {
    setVerdict(value);
    doSearch(query, value);
  }

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await listReviews({
        query: query || undefined,
        verdict:
          verdict !== ALL_VERDICTS ? (verdict as Verdict) : undefined,
        cursor,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.reviews) {
        setReviews((prev) => [...prev, ...result.reviews!]);
        setCursor(result.nextCursor);
      }
    });
  }

  const hasFilters = query.length > 0 || verdict !== ALL_VERDICTS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="بحث باسم أو رمز المقرر…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            dir="auto"
          />
        </div>
        <div className="w-[200px]">
          <Select value={verdict} onValueChange={handleVerdictChange}>
            <SelectTrigger>
              <SelectValue placeholder="جميع الأحكام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VERDICTS}>جميع الأحكام</SelectItem>
              {VERDICT_OPTIONS.map((v) => (
                <SelectItem key={v} value={v}>
                  {VERDICT_LABELS_AR[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="default"
          size="icon"
          onClick={handleSearch}
          disabled={pending}
        >
          {isSearching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
        </Button>
        {hasFilters ? (
          <Button
            variant="outline"
            size="icon"
            onClick={handleClear}
            disabled={pending}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        hasFilters ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            لم يتم العثور على مراجعات تطابق معايير البحث.
          </p>
        ) : (
          <ReviewsEmptyState />
        )
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {cursor ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={pending}
          >
            {pending && !isSearching ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                جارٍ التحميل…
              </>
            ) : (
              "تحميل المزيد"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
