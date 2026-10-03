# Dormant paid-infrastructure checkpoint — not activated

Local branch: `production-paid-beta-preparation`, base `09c1c240c09cf1fb11312b1e21edd53e8426c22c`. The owner has approved a dormant production commit, main push and normal Workers Build after full validation; activation remains withheld. This complete file inventory includes the earlier prepared foundation and the latest invite-only gate; it is not a paid-staging merge.

## Production configuration proposed for the reviewed dormant release

`wrangler.jsonc` uses `src/worker/paid-production-index.mjs`; adds the existing dedicated production PAID_DB and private AuthMailer service, an hourly cleanup schedule inert while master off, workers.dev/preview off, and the already-provisioned LIVE price/Portal IDs. The three existing rate-limit names, namespaces and limits are unchanged. `keep_vars=true` preserves existing runtime values. No OpenAI key/model/vector-store setting is supplied or changed by this checkpoint.

Flags: `AI_PAYWALL_ENABLED=false`, `AUTH_SIGNIN_ENABLED=false`, `AUTH_MAIL_ENABLED=false`. Other prepared variables: `PAID_ENVIRONMENT=production`, `BILLING_TEST_MODE=false`, `ACCOUNT_ORIGIN=https://acquisitioncompanion.com`, `AI_ALLOW_TRIALS=false`, `AI_MONTHLY_REQUEST_LIMIT=100`, privacy-safe `PAID_DIAGNOSTICS_ENABLED=true`. Usage-retention approval and periods are unset in production; examples default approval false.

Migration 0001 is provisioned and verified remotely. Migration 0002 was applied to the dedicated production database under release approval. Remote synthetic approval/revocation, Checkout gate and entitlement-isolation checks passed; all synthetic records were removed. No real account is approved. Approval and fresh U.S.-customer attestation gate hosted Checkout; canonical subscriptions alone grant AI access.

Pre-release production rollback point is `85778d54-fcfe-4a0e-a7b2-db9e3946d980`, 100% traffic, after operator secret entry. `/ai/` returned 200, AI status ready, billing/sign-in availability false, and one anonymous educational AI request returned 200 with three citations. Migration 0002 is the sole schema addition. No real paid account, live purchase, email or beta approval was created. Both LIVE Stripe and private-mailer secret binding names were verified without reading values.

## Exact intended files

- `.dev.vars.example`
- `README.md`
- `docs/paid-access.md`
- `docs/paid-beta-approval.md`
- `docs/paid-beta-launch-operations.md`
- `docs/paid-beta-production-plan.md`
- `docs/paid-dormant-release-checkpoint.md`
- `docs/paid-launch-legal-draft.md`
- `docs/paid-retention-review.md`
- `migrations/0001_paid_access.sql`
- `migrations/0002_paid_beta_checkout.sql`
- `package.json`
- `scripts/browser-paid-check.mjs`
- `scripts/paid-d1-runtime-check.mjs`
- `scripts/verify-paid-production-d1.mjs`
- `src/layouts/Base.astro`
- `src/lib/analytics.mjs`
- `src/lib/paid-product.mjs`
- `src/pages/account.astro`
- `src/pages/ai/index.astro`
- `src/pages/pricing.astro`
- `src/pages/privacy.astro`
- `src/pages/terms.astro`
- `src/scripts/ai-lab.ts`
- `src/scripts/paid-account.ts`
- `src/site-config.mjs`
- `src/worker/ai-api.mjs`
- `src/worker/auth-mailer-entry.mjs`
- `src/worker/auth-mailer.mjs`
- `src/worker/index.mjs`
- `src/worker/paid-access.mjs`
- `src/worker/paid-api.mjs`
- `src/worker/paid-auth.mjs`
- `src/worker/paid-production-index.mjs`
- `src/worker/paid-retention.mjs`
- `src/worker/paid-security.mjs`
- `src/worker/paid-store.mjs`
- `src/worker/ses-mailer.mjs`
- `src/worker/stripe-billing.mjs`
- `tests/ai-worker.test.mjs`
- `tests/analytics.test.mjs`
- `tests/paid-access.test.mjs`
- `tests/paid-beta.test.mjs`
- `tests/paid-production.test.mjs`
- `tests/paid-services.test.mjs`
- `tests/paid-storage.test.mjs`
- `tests/paid-ui.test.mjs`
- `tests/ses-mailer.test.mjs`
- `wrangler.jsonc`
- `wrangler.mailer-production.example.json`
- `wrangler.paid-production.example.json`

## Excluded from any commit

`node_modules` is a temporary dependency symlink, not a release file. All artifacts, dist, .astro, .wrangler and ignored .dev.vars verification configurations remain excluded. No real credential values were detected in the intended files. Fixture keys and example placeholders are not runtime credentials. No staged files exist.

## Remaining gates

final legal/refund/retention/deletion review and U.S. tax/nexus review; monitoring ownership and reconciliation procedure exercise; successful dormant commit/build/deploy with flags off; separate authorized SES delivery/sign-in test; explicit final activation approval and a separately authorized real purchase if desired. Staging resources and production OpenAI configuration remain unchanged.
