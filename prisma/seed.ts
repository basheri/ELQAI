import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// WHY: seed runs via `tsx` outside the Next.js runtime, so it uses a local
// PrismaClient instance (not the app's @/lib/db singleton) and closes it at the end.
const prisma = new PrismaClient();

// WHY: mirror the Framework enum in schema.prisma; Zod guards the seed JSON
// (which the owner hand-edits from a licensed source) before any DB write.
const RubricCriterionSchema = z.object({
  framework: z.enum([
    "QM",
    "NELC",
    "CONTENT",
    "ACCESSIBILITY",
    "CULTURAL_SAFETY",
  ]),
  code: z.string().min(1),
  // WHY: QM titles ship blank on purpose — the proprietary text is filled by the
  // owner from a licensed source, so empty strings are valid placeholders here.
  titleAr: z.string(),
  titleEn: z.string(),
  weight: z.number().int().positive(),
  descAr: z.string().optional().default(""),
});

const RubricSeedSchema = z.array(RubricCriterionSchema);

async function main(): Promise<void> {
  const seedPath = join(__dirname, "rubric.seed.json");
  const raw = readFileSync(seedPath, "utf-8");
  const parsed: unknown = JSON.parse(raw);

  const criteria = RubricSeedSchema.parse(parsed);

  // WHY: upsert by unique `code` so re-running the seed is idempotent and never
  // duplicates criteria; a wrapping transaction keeps the rubric write atomic.
  await prisma.$transaction(
    criteria.map((c) =>
      prisma.rubricCriterion.upsert({
        where: { code: c.code },
        update: {
          framework: c.framework,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          weight: c.weight,
          descAr: c.descAr,
        },
        create: {
          framework: c.framework,
          code: c.code,
          titleAr: c.titleAr,
          titleEn: c.titleEn,
          weight: c.weight,
          descAr: c.descAr,
        },
      }),
    ),
  );

  console.log(`Seeded ${criteria.length} rubric criteria.`);
}

main()
  .catch((error) => {
    console.error("Rubric seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
