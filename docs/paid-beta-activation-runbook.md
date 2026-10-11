# Production paid-beta deployment and rollback

The U.S.-only Acquisition Companion Deal Lab beta is live and invite-only. This runbook protects the live configuration during ordinary code deployments and documents an explicit fail-closed rollback.

## Production configuration source of truth

The root `wrangler.jsonc` is the canonical main Worker deployment config. It intentionally declares:

| Main Worker variable | Production value |
| --- | --- |
| `AI_INTERACTIVE_ENABLED` | `true` |
| `AI_PAYWALL_ENABLED` | `true` |
| `AUTH_SIGNIN_ENABLED` | `true` |
| `BILLING_ENABLED` | `true` |
| `AUTH_MAIL_ENABLED` | `false` |

The private `acquisition-companion-mailer-production` Worker is deployed from `wrangler.mailer-production.example.json`; it intentionally declares `AUTH_MAIL_ENABLED=true` and has `workers_dev=false` and `preview_urls=false`.

Keep these values aligned with production. A production hotfix showed that checked-in `vars` containing `false` could disable the live gates during a Wrangler deployment even when `--keep-vars` was supplied. Treat `keep_vars` as preservation behavior for other existing variables, not as protection against incorrect values explicitly declared in the deployment config. `tests/ai-worker.test.mjs` and `tests/paid-production.test.mjs` fail if these production values drift.

Do not deploy `wrangler.paid-production.example.json` to production. It is a dormant template with a placeholder database ID.

## Ordinary code deployment

Before deploying, use a clean checkout of the intended `main` commit. As of the latest production check, Cloudflare has no Workers Builds configuration attached to `acquisition-companion`, and production releases are direct Wrangler deployments. Pushing to `main` alone does not deploy. Run the full build and inspect the Wrangler dry run. Deploy the main Worker from the repository root with:

```sh
npx wrangler deploy --config wrangler.jsonc --keep-vars
```

The private mailer is deployed separately only when its code/config changes:

```sh
npx wrangler deploy --config wrangler.mailer-production.example.json --keep-vars
```

Immediately after each deployment, verify the active Worker version and effective variables in the Cloudflare dashboard. Confirm the main values in the table above and private mailer `AUTH_MAIL_ENABLED=true`. Also check `/api/ai/status`, `/api/billing/status`, sign-in, and billing behavior. Preserve all Worker secrets and bindings, production D1 data, LIVE Stripe configuration/webhook, and OpenAI model/vector-store settings. If the effective values do not match this runbook, stop further deploys and apply the rollback below.

## Explicit fail-closed rollback

If an incident requires disabling interactive AI, sign-in, billing, and new auth mail, deploy explicit false overrides. Do not rely on dormant defaults or the paid-production template:

```sh
npx wrangler deploy --config wrangler.jsonc \
  --var AI_INTERACTIVE_ENABLED:false \
  --var AI_PAYWALL_ENABLED:false \
  --var AUTH_SIGNIN_ENABLED:false \
  --var BILLING_ENABLED:false \
  --keep-vars

npx wrangler deploy --config wrangler.mailer-production.example.json \
  --var AUTH_MAIL_ENABLED:false \
  --keep-vars
```

Verify the effective main gates are all `false`, main `AUTH_MAIL_ENABLED=false`, and private mailer `AUTH_MAIL_ENABLED=false`. Confirm `/ai/` remains readable, interactive requests fail closed before OpenAI, auth and billing routes are unavailable, and legitimate accounts, subscriptions, entitlements, usage, and payments remain intact. Keep the LIVE Stripe webhook enabled while any subscription has lifecycle events to reconcile. Never insert subscription or entitlement state manually; use the documented billing reconciliation procedure and stop/escalate if no legitimate signed event is available.

While this rollback is in effect, freeze routine deployments: the canonical production config intentionally restores the live gate values on the next ordinary deploy. Resolve the incident and explicitly redeploy the reviewed live configuration before inviting customers again.
