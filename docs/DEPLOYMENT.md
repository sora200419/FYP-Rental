# Deployment

The app is designed for **Vercel** with a managed **PostgreSQL** database (Neon, Supabase, Vercel Postgres, etc.).

## 1. Vercel project

1. Import the GitHub repository into Vercel.
2. Set **Root Directory** to `rentalease-malaysia`. The repository root holds only docs, so the build fails without this.
3. Leave the framework preset as Next.js. Use Node.js 20 or later.
4. Add every variable from [`rentalease-malaysia/.env.example`](../rentalease-malaysia/.env.example) under **Settings → Environment Variables**.

The build command (`npm run build`) runs `prisma generate && prisma migrate deploy && tsx scripts/bootstrap-admin.ts && next build`. Every deployment, **including preview deployments**, therefore applies pending migrations to whatever database its `DATABASE_URL` points at. Give preview deployments their own database, or move `migrate deploy` out of the build (see [`AUDIT.md`](AUDIT.md)).

If your provider gives you a pooled connection string (pgBouncer), use the direct (non-pooled) URL for migrations.

## 2. Third-party services

| Service | Variables | Notes |
|---|---|---|
| PostgreSQL | `DATABASE_URL` | Migrations live in `prisma/migrations` |
| NextAuth | `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | `NEXTAUTH_URL` must be the public URL; email links are built from it |
| Anthropic | `ANTHROPIC_API_KEY` | Model `claude-haiku-5-5` (set in `src/lib/ai.ts`). Create the key in the Claude Console and set a monthly spend limit |
| Cloudinary | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `next.config.ts` limits `next/image` to `res.cloudinary.com/<cloud name>/**` |
| Upstash Redis | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| Resend | `RESEND_API_KEY`, `EMAIL_FROM` | Verify the sender domain. Resend's default test sender only delivers to your own address |
| Admin bootstrap | `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), `ADMIN_NAME` (optional) | Created during `npm run build`, or with `npm run admin:bootstrap`. If a non-admin account already uses `ADMIN_EMAIL` it is left alone; pick another email |
| Sepolia (optional) | `BLOCKCHAIN_PRIVATE_KEY`, `SEPOLIA_RPC_URL` | Dedicated wallet with test ETH only. If unset, anchoring is skipped and logged |

## 3. Cron

`rentalease-malaysia/vercel.json` schedules `/api/cron/expire-tenancies` daily at `0 17 * * *`, which is 17:00 UTC (01:00 Malaysia time).

- Set `CRON_SECRET` in Vercel. Vercel then sends `Authorization: Bearer <CRON_SECRET>` automatically.
- To trigger it by hand:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/expire-tenancies
```

## 4. Database operations

Run these from `rentalease-malaysia/` with `DATABASE_URL` set.

```bash
npx prisma migrate deploy
```

```bash
npx prisma studio
```

To create a new migration during development:

```bash
npx prisma migrate dev --name <change>
```

`scripts/delete-users.ts` hard-deletes test accounts together with their dependent rows:

```bash
npx tsx scripts/delete-users.ts <userId> [<userId> ...]
```

### One-off: make existing identity files private

KYC images and signed agreement scans uploaded before the switch to private storage are still public. Run this once per environment, with that environment's `DATABASE_URL` and `CLOUDINARY_*` set. It is safe to run again.

```bash
npx tsx scripts/make-private-assets.ts
```

## 5. Before a demo or submission

- `npm run typecheck`, `npm run lint` and `npm test` all pass.
- `npm run build` succeeds locally with production-like env vars.
- The admin account can log in. KYC approval works, and each emailed link opens the correct page.
- Run the cron once by hand and check the JSON summary.
- **Never commit or zip `.env`.** If a `.env` with real keys was ever shared (for example inside a submission archive), rotate every key in it.
