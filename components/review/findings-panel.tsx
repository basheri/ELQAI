"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { updateFinding } from "@/actions/findings";
import type { Finding } from "@/types";
import { SEVERITY_LABELS, FRAMEWORK_LABELS } from "@/types";

interface Props {
  findings: Finding[];
  locked: boolean;
}

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function FindingsPanel({ findings, locked }: Props) {
  const grouped = findings.reduce(
    (acc, f) => {
      if (!acc[f.framework]) acc[f.framework] = [];
      acc[f.framework].push(f);
      return acc;
    },
    {} as Record<string, Finding[]>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">الملاحظات</h3>
      {Object.entries(grouped).map(([framework, items]) => (
        <div key={framework} className="space-y-2">
          <h4 className="font-medium text-muted-foreground">
            {FRAMEWORK_LABELS[framework] ?? framework}
          </h4>
          {items
            .sort(
              (a, b) =>
                SEVERITY_ORDER.indexOf(a.severity) -
                SEVERITY_ORDER.indexOf(b.severity)
            )
            .map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                locked={locked}
              />
            ))}
        </div>
      ))}
    </div>
  );
}

function FindingCard({
  finding,
  locked,
}: {
  finding: Finding;
  locked: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(finding.descriptionAr);
  const [recommendation, setRecommendation] = useState(
    finding.recommendationAr
  );
  const [severity, setSeverity] = useState(finding.severity);
  const [saving, setSaving] = useState(false);

  const severityColor: Record<string, string> = {
    CRITICAL: "text-red-600 dark:text-red-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    MEDIUM: "text-yellow-600 dark:text-yellow-400",
    LOW: "text-green-600 dark:text-green-400",
  };

  async function handleSave() {
    setSaving(true);
    await updateFinding({
      findingId: finding.id,
      descriptionAr: description,
      recommendationAr: recommendation,
      severity: severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function handleToggleAccepted() {
    await updateFinding({
      findingId: finding.id,
      accepted: !finding.accepted,
    });
    router.refresh();
  }

  return (
    <div
      className={`rounded-lg border p-4 ${!finding.accepted ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${severityColor[finding.severity]}`}>
            {SEVERITY_LABELS[finding.severity]}
          </span>
          {finding.criterionRef && (
            <span className="text-xs text-muted-foreground" dir="ltr">
              {finding.criterionRef}
            </span>
          )}
          {finding.overridden && (
            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-xs dark:bg-yellow-900">
              معدّل
            </span>
          )}
        </div>
        {!locked && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
            >
              {editing ? "إلغاء" : "تعديل"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToggleAccepted}>
              {finding.accepted ? "استبعاد" : "تضمين"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium">الشدة</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as typeof severity)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Object.entries(SEVERITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">الوصف</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium">التوصية</label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      ) : (
        <div className="mt-2 space-y-1 text-sm">
          <p>{finding.descriptionAr}</p>
          <p className="text-muted-foreground">
            التوصية: {finding.recommendationAr}
          </p>
          {finding.location && (
            <p className="text-xs text-muted-foreground" dir="ltr">
              {finding.location}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
