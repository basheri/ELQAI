import { PrismaClient, Framework } from "@prisma/client";
import seedData from "./rubric.seed.json";

const prisma = new PrismaClient();

interface SeedCriterion {
  framework: string;
  code: string;
  titleAr: string;
  titleEn: string;
  weight: number;
  descAr: string;
}

async function main() {
  console.log("Seeding rubric criteria...");

  for (const item of seedData as SeedCriterion[]) {
    await prisma.rubricCriterion.upsert({
      where: { code: item.code },
      update: {
        framework: item.framework as Framework,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        weight: item.weight,
        descAr: item.descAr || null,
      },
      create: {
        framework: item.framework as Framework,
        code: item.code,
        titleAr: item.titleAr,
        titleEn: item.titleEn,
        weight: item.weight,
        descAr: item.descAr || null,
      },
    });
  }

  console.log(`Seeded ${seedData.length} rubric criteria.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
