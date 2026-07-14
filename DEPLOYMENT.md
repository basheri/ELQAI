# DEPLOYMENT.md — ELQAI

## Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Supabase project with Auth and Storage enabled
- Anthropic API key with zero-retention enabled
- Chromium (for Playwright PDF generation)

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (safe for client) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service-role key (server-only) |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `ANTHROPIC_MODEL` | No | Analysis model (default: `claude-opus-4-8`) |

## Supabase Setup

### Storage Buckets

Create two private buckets in Supabase Storage:

1. **`course-exports`** — Uploaded Blackboard zip files
2. **`report-exports`** — Generated PDF and Word reports

### Auth Configuration

Enable email/password authentication in Supabase Auth settings.

## Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed rubric criteria (populate prisma/rubric.seed.json first)
npx prisma db seed
```

## Build and Run

```bash
# Install dependencies
npm install

# Install Playwright browsers (for PDF generation)
npx playwright install chromium

# Build for production
npm run build

# Start production server
npm start
```

## Initial User Setup

The first user to log in is auto-created with the `REVIEWER` role in a default organization. To promote a user to `ADMIN` or `LEADERSHIP`:

```sql
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

## GitHub Branch Protection (Recommended)

Configure branch protection on the `main` branch via Settings > Branches > Add rule:

| Setting | Recommended Value |
|---------|-------------------|
| Require status checks to pass | Yes — require `Lint, Test, Build` |
| Require branches to be up to date | Yes |
| Require pull request reviews | Yes — at least 1 approving review |
| Require conversation resolution | Yes — all review threads resolved |
| Restrict force pushes | Yes — no force pushes to main |
| Restrict branch deletion | Yes — prevent main deletion |
| Allow auto-merge | Optional — safe with the above gates |

These settings ensure no code reaches `main` without passing CI and human review.

## CI Pipeline

GitHub Actions runs automatically on every push to `main` and every PR targeting `main`. The workflow (`.github/workflows/ci.yml`) executes:

1. `npm ci` — reproducible dependency install from lockfile
2. `npx prisma generate` — generate Prisma client
3. `npm run lint` — ESLint
4. `npx tsc --noEmit` — TypeScript strict check
5. `npm test` — Vitest (85 tests)
6. `npm run build` — Next.js production build
7. `npm audit --audit-level=high` — dependency audit (non-blocking)

## Rollback Guidance

If a deployment introduces a regression:

1. Revert the commit: `git revert <sha> && git push`
2. If a database migration was involved and is backward-compatible, no schema rollback is needed
3. If a migration is not backward-compatible, restore from the pre-deployment database backup before reverting the code
4. Verify the revert passes CI before merging

## Known Limitations

- Rate limiting is in-memory (single-instance only; use Redis for multi-instance)
- Monthly trend aggregation uses server timezone (UTC recommended in production)
- PII scrubber is intentionally aggressive — may exclude some legitimate content to err on the side of privacy
- npm audit reports transitive vulnerabilities in Next.js and Vitest dependencies that cannot be fixed without breaking version upgrades

## Production Considerations

- **Data residency**: Per governance rule #7, confirm KSA hosting before production deployment.
- **Rate limiting**: The current in-memory rate limiter is suitable for single-instance deployments. For multi-instance, switch to Redis-backed limiting.
- **Chromium**: Ensure the production environment has Chromium available for Playwright PDF generation. On serverless platforms, consider a dedicated worker for report generation.
- **Storage**: Supabase Storage handles file lifecycle. Configure bucket policies to restrict access to authenticated users only.
