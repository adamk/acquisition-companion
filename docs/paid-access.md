# Dormant paid-access foundation

**Preparation only. Master flag defaults off. Nothing was provisioned or deployed.**

## Runtime architecture

Astro continues generating static assets. The same Worker routes `/api/auth/*`, `/api/account`, `/api/billing/*` and the existing AI API ahead of `ASSETS`. Runtime gates are independent: `AI_PAYWALL_ENABLED` controls entitlement checks on Deal Lab requests; `AUTH_SIGNIN_ENABLED` controls auth and account endpoints; `BILLING_ENABLED` controls Checkout and Customer Portal endpoints. Public `/api/billing/status` reports the independent availability states. The Stripe webhook is separately protected by its disabled/enabled Stripe destination, complete billing configuration and exact signature verification.

`AI_INTERACTIVE_ENABLED` independently controls whether interactive AI is available at all. It defaults off and must be exactly `true` before `/api/ai` can invoke a model; with it off, `/api/ai/status` reports `prelaunch` and requests fail before OpenAI. `AI_PAYWALL_ENABLED` controls only whether an active entitlement is required after interactive AI has been enabled. With interactivity enabled and the paywall off, AI remains public; a valid account session is opportunistically checked for a current canonical `ai_deal_lab` entitlement and only that account's request is recorded as paid usage. Anonymous and authenticated non-entitled requests do not create paid usage records, and metering-storage failure never turns open AI into an account requirement. Auth or billing may be tested independently without restricting public AI. With the paywall on, `/api/ai` checks a server-validated session and `isUserEntitledTo('ai_deal_lab')` before any model call. Missing required configuration/storage fails closed. `AI_ENABLED` remains an independent emergency model kill switch. Checkout requires `BILLING_ENABLED`, an authenticated session, same-origin JSON, session-bound CSRF, active `paid_beta_checkout` approval, and explicit U.S.-customer attestation; none of those grants AI access.

D1 is the optional native persistence choice, via `PAID_DB` and `D1PaidStore`. Apply `migrations/0001_paid_access.sql` only to a newly approved database after review. No database IDs or production binding edits are included. SQLite adapter tests exercise actual migration/query transactions; staging must also verify Cloudflare D1 semantics and concurrent writes.

## Authentication

Passwordless email: `POST /api/auth/start` accepts a capped email, applies the existing IP limiter under an auth-prefixed key and a three-per-email/hour counter. Responses do not enumerate existing accounts. A trusted `AUTH_MAILER` service binding receives `{email,url}` via `/sign-in`; **no delivery vendor is selected or implemented**. The service must send only the sign-in message, avoid token logging/tracking and validate its calling service. Delivery identity, SPF/DKIM/DMARC, abuse protection and availability are launch gates.

Links have 256-bit random tokens, hashes at rest, a 15-minute expiry and a separate browser-bound HttpOnly cookie. Token is in the fragment, not an HTTP query. `/account/` immediately clears it, suppresses analytics, and requires explicit confirmation; visiting a GET cannot consume a link. Confirmation consumes the challenge once and creates an opaque seven-day `__Host-ac-session` cookie (Secure, HttpOnly, SameSite=Lax, Path=/). Sessions/CSRF tokens are hashed; logout revokes the current session. Same-origin JSON POST is mandatory; authenticated mutations also require a session-bound CSRF header. There are no passwords or social logins. Multi-device/recovery, email changes, deletion and account-wide revocation require reviewed support procedures before launch.

`GET /api/account` is user-authenticated, same-origin JS only. It returns only own subscription status/period and own monthly usage summary, plus a CSRF token. No customer/subscription IDs, email address, admin data or conversations are returned. There is no admin UI.

## Stripe

Server-side REST adapter, pinned API version `2025-06-30.basil`, ten-second timeout. No browser SDK, new dependency, CSP change or card storage. Explicit configured monthly/annual Price IDs feed one-product subscription Checkout. Customers are mapped to authenticated user IDs; stable customer idempotency keys prevent duplicate creation. Checkout attempts reuse a five-minute idempotency window; existing entitled subscribers use the Portal. Return destinations are server-selected same-origin pages and hosted redirect URLs are allowlisted.

`POST /api/billing/webhook` verifies exact raw bytes with HMAC-SHA256 and the Stripe signature timestamp (five-minute tolerance). Event IDs are idempotent. A per-customer D1 lease serializes reconciliation; it fetches current subscription state instead of trusting old event bodies or client metadata. Event ledger and grant change commit together. Only mapped customers and the two configured prices qualify. Subscribe to `customer.subscription.created`, `updated`, `deleted`, `paused`, `resumed`, plus `invoice.paid` and `invoice.payment_failed`. Active grants expire at the verified period end. Scheduled cancellation retains access through that end; immediate cancellation, past_due, unpaid, incomplete, paused and unapproved prices deny. Trials require explicit `AI_ALLOW_TRIALS=true`; no automatic trial is offered.

Webhook delivery is eventually consistent. Before launch, test out-of-order events, renewals, dunning, cancellation, duplicates, multi-tab Checkout and a lost webhook in Stripe sandbox. Define a reconciliation/alert runbook for missed events; expiry fails closed but may deny a paid renewal if delivery fails. Stored billing state is not a live Stripe query on every AI call. Refund effects and immediate revocation must match the reviewed policy; they are not inferred from a refund event.

## Usage accounting

When the paywall is on, each allowed authenticated model attempt reserves an event and increments its UTC monthly request count atomically before the provider call; the configured limit blocks the next attempt before OpenAI. With the paywall off, only a valid session with a current canonical `ai_deal_lab` entitlement is metered, and reservation uses no blocking quota limit so anonymous/free AI remains open. Anonymous and authenticated non-entitled requests skip paid usage writes. If optional lookup/reservation/finalization fails while the paywall is off, the AI request remains available and usage may be absent. Invalid/unauthorized/rate-limited submissions do not make model calls or consume monthly usage. Failed metered model attempts do count. Completion records only token counts, model, workflow, success/failure and latency. Reasoning tokens are a subset of output, never charged twice. Configurable per-million rates estimate input/cached-input/output cost; no provider price is invented. Missing pricing/usage produces NULL cost, and the aggregate separately reports unknown-cost count. File Search/tool charges, taxes and other provider fees are not modeled by these token estimates.

If a completion write fails after a metered call, its reservation still counts and cost stays unknown. With the paywall on, the response fails safely; with the paywall off, optional metering failure does not block the public AI response. No automatic model retry. Usage schema has no prompt, response, financial facts, history or document columns. Implement approved retention and purge jobs before launch. Never log SQL parameters, tokens or provider payloads.

## Configuration (Worker runtime, never Astro public/build variables)

| Setting | Purpose/default |
| --- | --- |
| `AI_INTERACTIVE_ENABLED` | Interactive AI availability; only the exact value `true` allows model requests. Defaults off. |
| `AI_PAYWALL_ENABLED` | Entitlement requirement for interactive AI; absent/false = off. Does not turn interactivity on. |
| `AUTH_SIGNIN_ENABLED` | Explicit email sign-in switch; absent/false = off. |
| `BILLING_ENABLED` | Explicit Checkout/Portal switch; absent/false = off. Does not grant entitlement. |
| `AUTH_MAIL_ENABLED` | Enforced by the private mailer Worker only; enabling the main auth API does not bypass it. |
| `PAID_DB` | Optional D1 binding, approved/provisioned later. |
| `AUTH_MAILER` | Trusted service binding, chosen/configured later. |
| `ACCOUNT_ORIGIN` | Account/billing origin; defaults to `https://acquisitioncompanion.com`. |
| `STRIPE_SECRET_KEY` | Secret; sandbox first, live only after separate launch approval. |
| `STRIPE_WEBHOOK_SECRET` | Secret matching the specific endpoint/environment. |
| `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` | Two approved recurring prices for one product. |
| `AI_MONTHLY_REQUEST_LIMIT` | Optional nonnegative integer; 0 denies attempts; no fixed commercial allowance. |
| `AI_ALLOW_TRIALS` | Defaults off; enabling requires reviewed trial policy. |
| `AI_MODEL_PRICING_JSON` | Rates keyed by exact model ID: `{"example-model":{"inputPerMillion":0,"cachedInputPerMillion":0,"outputPerMillion":0}}`. Example zero rates are placeholders, NOT actual prices. Missing rates remain unknown. |

Existing `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `OPENAI_MODEL`, `AI_ENABLED` remain server-only and unchanged. `PUBLIC_GA_MEASUREMENT_ID` and `SITE_URL` remain Astro build variables. Proposed display prices are centralized in `src/lib/paid-product.mjs`; changing a price must update display and Stripe configuration together, without rewriting access logic. No commercial secret or real price/store/customer ID is committed.

## Launch checklist — required before `AI_PAYWALL_ENABLED=true`

1. Approve architecture and email delivery service; threat-review the integration and sender security.
2. Review/publish legal/privacy/account-retention/refund/allowance policy. Update outdated “no accounts/subscriptions” site/footer wording to distinguish free curriculum from optional paid AI. Current public statements remain accurate with flag off.
3. Provision a dedicated D1 database, bind `PAID_DB`, apply reviewed migration, test storage errors, transaction rollback, concurrent quota reservation and webhook leases on Cloudflare staging.
4. Configure mailer binding and runtime `ACCOUNT_ORIGIN`/sign-in settings in staging. Test delivery, expiry, scanners, login CSRF, session/logout/recovery and deletion. Add routine expired credential/abuse-counter cleanup under the approved retention policy.
5. Create ONE sandbox Stripe product and monthly/annual recurring USD prices corresponding to $19/$190. Configure hosted Checkout/Portal, cancellation, tax/refund disclosures and signed webhook events. No live resources yet.
6. Run sandbox lifecycle/security/browser tests; validate renewals, payment failures, immediate/end-period cancellation, trial if elected, duplicate/out-of-order/missed webhooks, Checkout concurrency and support/reconciliation workflow.
7. Select commercial request allowance based on measured provider economics. Populate centrally configured model rates from verified provider pricing; include omitted tool costs in business accounting. Set usage retention/alerts; reconcile unknown-cost entries.
8. Only after explicit approval, create live product/prices, configure server secrets and endpoint signature secret through Cloudflare; never build them into Astro or print them. Verify public assets have no secrets.
9. Stage `AI_INTERACTIVE_ENABLED=true` and `AI_PAYWALL_ENABLED=true` and verify direct API denial, UI sign-in/pricing, paid access, privacy/consent and all existing AI/citation behavior. Public page copy must then be reviewed for launch (currently explicitly marked preparation).
10. Obtain explicit production activation approval. For a controlled account/Checkout drill that keeps anonymous AI open, enable `AI_INTERACTIVE_ENABLED=true`, `AUTH_SIGNIN_ENABLED=true`, `BILLING_ENABLED=true`, and the private mailer's `AUTH_MAIL_ENABLED=true`; leave `AI_PAYWALL_ENABLED=false`. To activate entitlement enforcement later, set `AI_PAYWALL_ENABLED=true` after reviewing entitled, unpaid, and anonymous states. Turning `AI_INTERACTIVE_ENABLED` off immediately stops interactive model requests while preserving the public workspace; disabling `AI_ENABLED` is the separate emergency model kill switch.

## Local validation

All paid tests use mocked delivery/Stripe, an in-memory SQLite-backed D1 adapter, and fake provider responses. They never create customers/products or contact live Stripe/OpenAI. Existing npm build/browser/privacy/source checks remain authoritative. Start with `npm test`, `npm run check`, `npm run build`; use existing browser scripts and `npm run deploy:worker:dry-run` only. Never run an actual deployment during preparation.

References: [Stripe webhook signatures](https://docs.stripe.com/webhooks/signature), [subscription events](https://docs.stripe.com/billing/subscriptions/webhooks), [Cloudflare D1 transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/), [OWASP sessions](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).

## Production paid-beta preparation

Current commercial draft is one US-only product at $19/month or $190/year, 100 requests per UTC month. Support is support@acquisitioncompanion.com. The master flag remains OFF. Production readiness, provisioned D1, separate SES/Stripe prerequisites and final activation gates are recorded in [paid-beta-launch-operations.md](paid-beta-launch-operations.md). Any older local/staging preparation descriptions above are historical and do not imply live credentials or activation.
