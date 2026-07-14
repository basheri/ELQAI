"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { setFindingAccepted, updateFinding } from "@/actions/findings";
import {
  FRAMEWORK_LABELS_AR,
  SEVERITY_LABELS_AR,
  SEVERITY_VARIANTS,
} from "@/lib/review-display";

import type { Finding, Severity } from "@prisma/client";

const SEVERITY_OPTIONS = Object.keys(SEVERITY_LABELS_AR) as Severity[];

export function FindingItem({
  finding,
  locked,
}: {
  finding: Finding;
  locked: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [severity, setSeverity] = useState<Severity>(finding.severity);
  const [descriptionAr, setDescriptionAr] = useState(finding.descriptionAr);
  const [recommendationAr, setRecommendationAr] = useState(
    finding.recommendationAr,
  );
  const [location, setLocation] = useState(finding.location ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateFinding({
        findingId: finding.id,
        severity,
        descriptionAr,
        recommendationAr,
        location: location || null,
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("تم حفظ التعديل على الملاحظة.");
      setOpen(false);
    });
  }

  function handleToggleAccepted() {
    startTransition(async () => {
      const result = await setFindingAccepted(finding.id, !finding.accepted);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(finding.accepted ? "تم استبعاد الملاحظة." : "تمت إعادة الملاحظة.");
    });
  }

  return (
    <li
      className={`rounded-md border p-3 ${finding.accepted ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant={SEVERITY_VARIANTS[finding.severity]}>
          {SEVERITY_LABELS_AR[finding.severity]}
        </Badge>
        <span>{FRAMEWORK_LABELS_AR[finding.framework]}</span>
        {finding.criterionRef ? (
          <span dir="ltr">· {finding.criterionRef}</span>
        ) : null}
        {finding.location ? <span dir="ltr">· {finding.location}</span> : null}
        {finding.overridden ? <Badge variant="outline">معدّلة</Badge> : null}
        {!finding.accepted ? <Badge variant="outline">مستبعدة</Badge> : null}
      </div>

      <p className="mt-2 text-sm">{finding.descriptionAr}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        التوصية: {finding.recommendationAr}
      </p>

      {!locked ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                تعديل
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تعديل الملاحظة</DialogTitle>
                <DialogDescription>
                  سيُعتمد نصّك بدلاً من اقتراح الذكاء الاصطناعي في التقرير.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`severity-${finding.id}`}>الخطورة</Label>
                  <Select
                    value={severity}
                    onValueChange={(value) => setSeverity(value as Severity)}
                  >
                    <SelectTrigger id={`severity-${finding.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {SEVERITY_LABELS_AR[option]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`desc-${finding.id}`}>وصف الملاحظة</Label>
                  <Textarea
                    id={`desc-${finding.id}`}
                    value={descriptionAr}
                    onChange={(e) => setDescriptionAr(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`rec-${finding.id}`}>التوصية</Label>
                  <Textarea
                    id={`rec-${finding.id}`}
                    value={recommendationAr}
                    onChange={(e) => setRecommendationAr(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`loc-${finding.id}`}>الموقع (اختياري)</Label>
                  <Input
                    id={`loc-${finding.id}`}
                    dir="ltr"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleSave} disabled={pending}>
                  {pending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      جارٍ الحفظ…
                    </>
                  ) : (
                    "حفظ"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAccepted}
            disabled={pending}
          >
            {finding.accepted ? "استبعاد" : "إعادة"}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
