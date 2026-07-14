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

## Production Considerations

- **Data residency**: Per governance rule #7, confirm KSA hosting before production deployment.
- **Rate limiting**: The current in-memory rate limiter is suitable for single-instance deployments. For multi-instance, switch to Redis-backed limiting.
- **Chromium**: Ensure the production environment has Chromium available for Playwright PDF generation. On serverless platforms, consider a dedicated worker for report generation.
- **Storage**: Supabase Storage handles file lifecycle. Configure bucket policies to restrict access to authenticated users only.
