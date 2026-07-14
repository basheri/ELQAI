import { Badge } from "@/components/ui/badge";

import type { ExaminedFile } from "@prisma/client";

interface FileInventoryProps {
  files: ExaminedFile[];
}

function FileRow({ file }: { file: ExaminedFile }) {
  return (
    <li className="flex flex-col gap-1 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <span dir="ltr" className="truncate text-sm">
          {file.fileName}
        </span>
        <Badge variant="outline" className="shrink-0 uppercase">
          {file.fileType}
        </Badge>
      </div>
      {file.reason ? (
        <span className="text-xs text-muted-foreground">{file.reason}</span>
      ) : null}
    </li>
  );
}

// WHY: the two inventory lists the reviewer sees after extraction —
// examinable content vs files that can't be auto-assessed (each with a reason).
export function FileInventory({ files }: FileInventoryProps) {
  const examinable = files.filter((file) => file.examinable);
  const notExaminable = files.filter((file) => !file.examinable);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          الملفات التي أمكن فحصها{" "}
          <span className="text-muted-foreground">({examinable.length})</span>
        </h2>
        {examinable.length > 0 ? (
          <ul className="space-y-2">
            {examinable.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            لا توجد ملفات قابلة للفحص في هذه الحزمة.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">
          الملفات التي تعذّر فحصها{" "}
          <span className="text-muted-foreground">({notExaminable.length})</span>
        </h2>
        {notExaminable.length > 0 ? (
          <ul className="space-y-2">
            {notExaminable.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            جميع ملفات الحزمة قابلة للفحص.
          </p>
        )}
      </section>
    </div>
  );
}
