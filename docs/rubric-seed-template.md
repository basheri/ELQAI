# Rubric Seed Template

The built-in rubric is **fixed** but its criterion text is **not shipped in this repo**. The Quality Matters rubric is proprietary/licensed, and NELC standards should be taken from the official current version. This file is the template you (the owner) fill in from authorized sources; it is then loaded by `prisma/seed.ts` into the `RubricCriterion` table.

## How to fill it

For each criterion, provide: framework, a unique code, Arabic title, English title, weight, and an optional Arabic description. Keep QM wording paraphrased/authorized — do not paste proprietary text you are not licensed to reproduce.

## Format (fill the blanks)

```jsonc
[
  // ---- Quality Matters (populate from your licensed QM source) ----
  { "framework": "QM",   "code": "QM-1.1", "titleAr": "", "titleEn": "", "weight": 3, "descAr": "" },
  { "framework": "QM",   "code": "QM-2.1", "titleAr": "", "titleEn": "", "weight": 3, "descAr": "" },

  // ---- NELC (populate from the official current NELC standard) ----
  { "framework": "NELC", "code": "NELC-1", "titleAr": "", "titleEn": "", "weight": 2, "descAr": "" },

  // ---- Content quality (define internally) ----
  { "framework": "CONTENT",       "code": "CNT-1", "titleAr": "دقة المحتوى وحداثته", "titleEn": "Content accuracy & currency", "weight": 2, "descAr": "" },

  // ---- Accessibility / usability (WCAG-aligned) ----
  { "framework": "ACCESSIBILITY", "code": "ACC-1", "titleAr": "بدائل نصية للوسائط", "titleEn": "Text alternatives for media", "weight": 2, "descAr": "" },

  // ---- Cultural / religious / political safety (authoritative source + human sign-off) ----
  { "framework": "CULTURAL_SAFETY", "code": "SAFE-1", "titleAr": "خلو المحتوى مما يخالف القيم والأنظمة", "titleEn": "No content conflicting with values/regulations", "weight": 3, "descAr": "" }
]
```

## Open items to confirm (PRD §10)
- QM: authorized source of criterion text.
- NELC: which official version/standard to encode.
- Cultural/religious/political safety: who defines the criteria and pass/flag/fail thresholds.
