# Paid-beta production preparation — activation withheld

Prepared 2026-10-03. No launch, main push, public paid deployment, payment or paywall activation is authorized by this preparation checkpoint. Production AI remains open. Master flag must remain `AI_PAYWALL_ENABLED=false` until the owner explicitly approves the final report.

## Architecture and migration choice

Reuse the reviewed paid-staging D1/session/Stripe entitlement/usage architecture; integrate its isolated seams into current production source, preserving the later operational-realism and mobile accessibility releases. Do not merge the staging branch, copy staging runtime secrets, or replace newer AI policy/calculations. Work on `production-paid-beta-preparation`, based on production commit `09c1c240c09cf1fb11312b1e21edd53e8426c22c`, in an isolated worktree. Production Worker is `acquisition-companion`; staging Worker is `acquisition-companion-paid-staging`. Their storage, mailer credentials, Stripe resources and bindings must remain separate.

## Staging → production inventory / checklist (before provisioning)

| Capability | Proven staging | Current production / preparation step |
|---|---|---|
| Core course/reference site | Free without account | Keep all educational routes free; preserve homepage/course hierarchy |
| Paid Worker code | D1 auth/billing/usage guarded by master flag | Absent on main; port only paid-access code, not staging entrypoint/infrastructure or old AI behavior |
| Storage | Dedicated staging D1, migration 0001 | Create NEW `acquisition-companion-paid-production`; apply reviewed migration; synthetic isolated adapter checks only |
| Sessions/auth | Hashed opaque HttpOnly Secure SameSite cookies; browser-bound 15-minute links | Production bindings absent; keep auth disabled during preparation; use same validated protocol |
| Email | Separate service + SES HTTPS, verified domain | Prepare NEW `acquisition-companion-mailer-production`, origin locked to public domain; NEW production-only least-privilege IAM sender; never reuse staging keys |
| Support | Not established as product support | Add support@acquisitioncompanion.com copy; Porkbun MX exists, individual alias/delivery unverified; operator must configure/confirm forwarding and receipt |
| Billing | Stripe Sandbox product/prices/portal/signed webhook | No live CLI access. Before creation verify live account/mode and report exactly one live product, two prices, one portal config and one webhook; no real customer/payment test |
| Entitlement | Canonical Stripe state → application grant; fails closed | Reuse enforcement at `/api/ai`; master off bypasses all account/storage/billing checks |
| Usage | Atomic UTC quota; metadata only; 20 staging allowance | Set production template to 100 per UTC month; disclose failed model attempts consume allowance; no prompts/deal history/cards/cost figures in public account API |
| Pricing/account | Noindex preparation pages, test Checkout/Portal | Finalize $19/$190 one-product copy, free-course distinction, support, usage/reset states; leave checkout unavailable with flag off |
| Legal/privacy | Unpublished review draft | Prepare reviewed-language draft, proposed refund policy and retention/deletion process; owner/entity/jurisdiction/legal approval still required before activation |
| Operations | Canonical reconciliation helper, diagnostic staging logging | Prepare production-only safe failure metadata, cleanup schedule and operator reconciliation procedure; alert/ownership/runbook must be configured before activation |
| Analytics | Consent-gated public helper; account suppresses all analytics | Add safe funnel allowlist; no identity, email, billing IDs, prompt/content. Webhooks do not send GA events without browser consent |
| Deployment | Separate staging config | Production root Wrangler remains unchanged during preparation; use separate disabled production candidate config for dry run; later normal release needs approval |

## Provisioning boundaries

- D1 database creation/migration is authorized preparation; do not bind it to the live Worker or activate accounts yet. First inspect database inventory to avoid duplicate creation.
- AWS SSO `twn-acquisition-staging` was expired at initial inspection, then refreshed by the owner. SES identity/DKIM verification passed; IAM production sender inspection was denied. Do not recover credentials from unrelated profiles. Wait for approved authenticated identity; report exact SES/IAM resource/permissions before creation. No auth email should be sent to unapproved recipients.
- Stripe authenticated account is Thewirednomad (`acct_1OLU7lKGOtHP6zWl`), TEST CLI access only; live access is unavailable. No live resources can be created or claimed verified yet.
- DNS reports Porkbun forwarding MX. This does not prove support@ exists or receives mail. Do not alter MX, forwarding or DKIM during preparation.

## Execution / acceptance

1. Port proven paid seams into current production source and write focused production-mode/support/allowance/analytics tests.
2. Prepare disabled production Worker/mailer configuration and exact secret/runbook inventory.
3. Provision isolated D1 if authorized CLI permits; prove schema, transaction/single-use/concurrency/quota/failure checks without altering existing users/resources.
4. Prepare production SES/Stripe resources only after access and identity/mode gates. Keep unresolved external/legal steps explicit.
5. Run complete unit/type/build/Pagefind/link/paid/AI/general/mobile/analytics/axe/privacy/provenance/protected-source/dry-run/diff gates. Verify disabled paywall preserves open AI behavior.
6. Stop with a reviewable diff and readiness report. No commit, push, deployment, public launch or paywall activation in this checkpoint.

## Preparation outcome

Support forwarding is operator-confirmed. Production D1 was created/migrated and actual remote synthetic adapter checks passed; test records were removed. IAM sender inspection was denied and stopped. Stripe LIVE access is absent. See [launch operations](paid-beta-launch-operations.md) for precise resource/configuration IDs and remaining legal/tax/security gates. No app deployment or activation.

## Authorized infrastructure continuation

The owner now authorizes production D1 and private mailer bindings plus LIVE Stripe resource preparation. No paid activation is authorized. Attach the already verified production database and named AuthMailer entrypoint to the existing application with AI_PAYWALL_ENABLED=false, AUTH_SIGNIN_ENABLED=false and AUTH_MAIL_ENABLED=false. Preserve current OpenAI values, canonical/analytics build variables, routing and three rate-limit bindings. Reuse the existing database; do not create a duplicate. Stripe account metadata still reports no LIVE CLI authorization; no LIVE mutation may proceed until that changes. Manual Stripe secret entry uses Wrangler secure prompts only.

## Current local checkpoint — invite-only beta

Preserve the proven hosted subscription Checkout. The owner rejected Radar and the SetupIntent/server-subscription/Stripe.js alternative as disproportionate for a 5–10-user beta. New local migration 0002 adds a separate operator-approved Checkout capability. Authentication, approval and explicit U.S.-customer attestation are required server-side before any Stripe Customer or Checkout creation; approval alone cannot grant AI access. See [approval procedure](paid-beta-approval.md) and [retention inventory](paid-retention-review.md).

All production flags remain false. Migration 0002 is not applied remotely, and no account has been approved. The existing production database/migration 0001 passed fresh synthetic checks with records removed. Prepared pricing/account/legal assets remain unpublished. The existing LIVE catalog and private disabled mailer are provisioned; restricted Stripe runtime secrets still need operator-confirmed secure entry. Current requirements supersede the historical pre-provisioning inventory above.

## Dormant release approval / verification

The owner approved the dormant production release with all activation flags false. Both main LIVE Stripe secret names and private mailer SES secret names are verified; values were not read or exported. The pre-release rollback version is 85778d54-fcfe-4a0e-a7b2-db9e3946d980. Migration 0002 is applied remotely; synthetic tests confirmed approval/revocation metadata, server-enforced Checkout eligibility, approval not granting AI and revocation preserving an existing synthetic paid grant. All synthetic rows were removed; no provider/customer/subscription/payment/email was created. These results supersede historical pending-secret/migration descriptions above. The LIVE webhook remains disabled. Final legal/refund/tax/retention/operations review and explicit mail/sign-in/paywall activation remain required.
