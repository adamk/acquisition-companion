# Paid-access architecture notes

**The public U.S.-only paid beta is live.** Customers 18 or older can subscribe after sign-in and U.S.-customer attestation. Use [customer operations](paid-beta-launch-operations.md) for support and [deployment/rollback](paid-beta-activation-runbook.md) for production gates. Historical manual approval records do not gate Checkout.

## Runtime architecture

Astro continues generating static assets. The same Worker routes `/api/auth/*`, `/api/account`, `/api/billing/*` and the existing AI API ahead of `ASSETS`. Runtime gates are independent: `AI_PAYWALL_ENABLED` controls entitlement checks on Deal Lab requests; `AUTH_SIGNIN_ENABLED` controls auth and account endpoints; `BILLING_ENABLED` controls Checkout and Customer Portal endpoints. Public `/api/billing/status` reports the independent availability states. The Stripe webhook is separately protected by its disabled/enabled Stripe destination, complete billing configuration and exact signature verification.

`AI_INTERACTIVE_ENABLED` independently controls whether interactive AI is available at all. It defaults off and must be exactly `true` before `/api/ai` can invoke a model; with it off, `/api/ai/status` reports `prelaunch` and requests fail before OpenAI. `AI_PAYWALL_ENABLED` controls only whether an active entitlement is required after interactive AI has been enabled. With interactivity enabled and the paywall off, AI remains public; a valid account session is opportunistically checked for a current canonical `ai_deal_lab` entitlement and only that account's request is recorded as paid usage. Anonymous and authenticated non-entitled requests do not create paid usage records, and metering-storage failure never turns open AI into an account requirement. Auth or billing may be tested independently without restricting public AI. With the paywall on, `/api/ai` checks a server-validated session and `isUserEntitledTo('ai_deal_lab')` before any model call. Missing required configuration/storage fails closed. `AI_ENABLED` remains an independent emergency model kill switch. Public Checkout requires `BILLING_ENABLED`, an authenticated session, same-origin JSON, session-bound CSRF and an explicit U.S.-customer attestation; a current `ai_deal_lab` entitlement prevents duplicate Checkout. Historical `paid_beta_checkout` approval records are not consulted and neither approval nor attestation grants AI access.

D1 is the production persistence layer through `PAID_DB` and `D1PaidStore`. Reviewed production migrations are applied to the dedicated paid-access database; do not rerun them during normal customer approval or support work. SQLite adapter tests exercise the migration/query transactions.

## Authentication

Passwordless email: `POST /api/auth/start` accepts a capped email, applies the existing IP limiter under an auth-prefixed key and a three-per-email/hour counter. Responses do not enumerate existing accounts. A trusted `AUTH_MAILER` service binding sends through the private production SES mailer. The mailer checks its own `AUTH_MAIL_ENABLED` flag, accepts only its application service binding and must not log or track tokens. Use the current operator checklist for delivery and recovery incidents.

Links have 256-bit random tokens, hashes at rest, a 15-minute expiry and a separate browser-bound HttpOnly cookie. Token is in the fragment, not an HTTP query. `/account/` immediately clears it, suppresses analytics, and requires explicit confirmation; visiting a GET cannot consume a link. Confirmation consumes the challenge once and creates an opaque seven-day `__Host-ac-session` cookie (Secure, HttpOnly, SameSite=Lax, Path=/). Sessions/CSRF tokens are hashed; logout revokes the current session. Same-origin JSON POST is mandatory; authenticated mutations also require a session-bound CSRF header. There are no passwords or social logins. For recovery, account deletion and account-wide actions, follow the current [operator procedures](paid-beta-launch-operations.md#other-support-incidents) and [manual account-deletion runbook](account-deletion-operations.md).

`GET /api/account` is user-authenticated, same-origin JS only. It returns only own subscription status/period and own monthly usage summary, plus a CSRF token. No customer/subscription IDs, email address, admin data or conversations are returned. There is no admin UI.

## Stripe

Server-side REST adapter, pinned API version `2025-06-30.basil`, ten-second timeout. No browser SDK, new dependency, CSP change or card storage. Explicit configured monthly/annual Price IDs feed one-product subscription Checkout. Customers are mapped to authenticated user IDs; stable customer idempotency keys prevent duplicate creation. Checkout attempts reuse a five-minute idempotency window; existing entitled subscribers use the Portal. Return destinations are server-selected same-origin pages and hosted redirect URLs are allowlisted.

`POST /api/billing/webhook` verifies exact raw bytes with HMAC-SHA256 and the Stripe signature timestamp (five-minute tolerance). Event IDs are idempotent. A per-customer D1 lease serializes reconciliation; it fetches current subscription state instead of trusting old event bodies or client metadata. Event ledger and subscription change commit together. A valid signed event whose customer lookup succeeds but has no Acquisition Companion mapping is acknowledged as ignored/non-AC, with no lock or billing write; D1 lookup errors remain failures. The production endpoint subscribes to `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, and `invoice.payment_failed`. Active grants expire at the verified period end. Scheduled cancellation retains access through that end; ineligible canonical states and unapproved prices deny. Trials require explicit `AI_ALLOW_TRIALS=true`; no automatic trial is offered.

Webhook delivery is eventually consistent. The production integration has been exercised through a live monthly purchase, renewal-state reconciliation, cancellation-at-period-end, usage metering and Customer Portal. For current missed-event and payment incidents, follow the [production reconciliation and support procedures](paid-beta-launch-operations.md#customer-paid-but-access-is-missing-webhook-recovery). Stored billing state is not a live Stripe query on every AI call. Refund effects and access changes follow the published [Terms](/terms/) and canonical subscription state; they are not inferred from an unverified client redirect.

## Usage accounting

When the paywall is on, each allowed authenticated model attempt reserves an event and increments its UTC monthly request count atomically before the provider call; the configured limit blocks the next attempt before OpenAI. With the paywall off, only a valid session with a current canonical `ai_deal_lab` entitlement is metered, and reservation uses no blocking quota limit so anonymous/free AI remains open. Anonymous and authenticated non-entitled requests skip paid usage writes. If optional lookup/reservation/finalization fails while the paywall is off, the AI request remains available and usage may be absent. Invalid/unauthorized/rate-limited submissions do not make model calls or consume monthly usage. Failed metered model attempts do count. Completion records only token counts, model, workflow, success/failure and latency. Reasoning tokens are a subset of output, never charged twice. Configurable per-million rates estimate input/cached-input/output cost; no provider price is invented. Missing pricing/usage produces NULL cost, and the aggregate separately reports unknown-cost count. File Search/tool charges, taxes and other provider fees are not modeled by these token estimates.

If a completion write fails after a metered call, its reservation still counts and cost stays unknown. With the paywall on, the response fails safely; with the paywall off, optional metering failure does not block the public AI response. No automatic model retry. Usage schema has no prompt, response, financial facts, history or document columns. Completion time is recorded separately so 90-day usage retention is measured from completion. The owner-approved retention policy and opt-in cleanup behavior are in [paid-retention-review.md](paid-retention-review.md); cleanup approval and periods remain unset in production. Never log SQL parameters, tokens or provider payloads.

## Configuration (Worker runtime, never Astro public/build variables)

| Setting | Purpose/default |
| --- | --- |
| `AI_INTERACTIVE_ENABLED` | Interactive AI availability; only exact `true` allows model requests. Application fallback is off; canonical production config is live/on. |
| `AI_PAYWALL_ENABLED` | Entitlement requirement for interactive AI; application fallback is off and production is on. Does not turn interactivity on. |
| `AUTH_SIGNIN_ENABLED` | Explicit email sign-in switch; application fallback is off and production is on. |
| `BILLING_ENABLED` | Explicit Checkout/Portal switch; application fallback is off and production is on. Does not grant entitlement. |
| `AUTH_MAIL_ENABLED` | Enforced by the private mailer Worker only; main Worker is off and the private production mailer is on. |
| `PAID_DB` | Dedicated production D1 binding. |
| `AUTH_MAILER` | Private production service binding to the SES mailer. |
| `ACCOUNT_ORIGIN` | Account/billing origin; defaults to `https://acquisitioncompanion.com`. |
| `STRIPE_SECRET_KEY` | Production secret. Never read or expose its value. |
| `STRIPE_WEBHOOK_SECRET` | Secret matching the enabled LIVE endpoint. Never read or expose its value. |
| `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` | Two approved recurring prices for one product. |
| `AI_MONTHLY_REQUEST_LIMIT` | Production paid allowance is 100 requests per UTC month; 0 denies attempts. |
| `AI_ALLOW_TRIALS` | Defaults off; enabling requires reviewed trial policy. |
| `AI_MODEL_PRICING_JSON` | Rates keyed by exact model ID: `{"example-model":{"inputPerMillion":0,"cachedInputPerMillion":0,"outputPerMillion":0}}`. Example zero rates are placeholders, NOT actual prices. Missing rates remain unknown. |
| `PAID_RETENTION_POLICY_APPROVED` | Must be exactly `true` before optional usage cleanup can delete rows; unset in production for this release. |
| `PAID_USAGE_RETENTION_DAYS` / `PAID_MONTHLY_USAGE_RETENTION_MONTHS` | Owner-approved periods are 90 days after completion and 13 months. Keep unset until a separate purge authorization. |

Existing `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `OPENAI_MODEL`, `AI_ENABLED` remain server-only and unchanged. `PUBLIC_GA_MEASUREMENT_ID` and `SITE_URL` remain Astro build variables. Proposed display prices are centralized in `src/lib/paid-product.mjs`; changing a price must update display and Stripe configuration together, without rewriting access logic. No commercial secret or real price/store/customer ID is committed.

## Historical preparation checklist — superseded

The original preparation and staging steps are retained below only as an implementation record. Production is live; do not use those historical provisioning steps as current instructions. Use the linked operations and deployment runbooks. The owner-approved Terms, Privacy and retention policy are published. This is not a claim of attorney review or approval.

## Local validation

All paid tests use mocked delivery/Stripe, an in-memory SQLite-backed D1 adapter, and fake provider responses. They never create customers/products or contact live Stripe/OpenAI. Existing npm build/browser/privacy/source checks remain authoritative. Start with `npm test`, `npm run check`, `npm run build`; use existing browser scripts and `npm run deploy:worker:dry-run` only. Never run an actual deployment during preparation.

References: [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature), [subscription events](https://docs.stripe.com/billing/subscriptions/webhooks), [Cloudflare D1 transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Production paid-beta preparation

The live offer is one public U.S.-only product at $19/month or $190/year, with up to 100 AI requests per UTC month for customers aged 18 or older. The public course and source-linked education remain free. Support is support@acquisitioncompanion.com. Current production operations are documented in [paid-beta-launch-operations.md](paid-beta-launch-operations.md); deployment gates and rollback are documented in [paid-beta-activation-runbook.md](paid-beta-activation-runbook.md). Historical preparation details do not override current production configuration.
