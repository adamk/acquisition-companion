# Paid-beta launch operations and activation gates

Prepared 2026-10-03. **Not launched. Dormant production bindings and LIVE billing resources are now authorized; account/billing/paywall activation and real payments remain prohibited. `AI_PAYWALL_ENABLED=false` remains mandatory until the owner's final explicit approval.** Selling entity: The Wired Nomad LLC. Product/trade names: Acquisition Companion / Acquisition Companion Deal Lab. Initial paid customers: United States only. The public educational site remains free internationally; paid expansion is a separate decision.

## Confirmed preparation results

- Operator confirms `support@acquisitioncompanion.com` forwards to `adam@thewirednomad.com`. Public MX remains `fwd1.porkbun.com` (10), `fwd2.porkbun.com` (20). No DNS/forwarding records changed by this task. Receipt is operator-confirmed, not independently mailbox-inspected.
- Dedicated production D1 `acquisition-companion-paid-production`: `fd456ea3-644c-4867-8089-5197378de990`. Reviewed `0001_paid_access.sql` applied. Actual remote adapter verification passed schema, concurrent account uniqueness, challenge binding/expiry/single use, sessions/logout/cleanup, entitlement/customer/subscription mapping, duplicate webhook rollback, customer lease, usage/failure/cost metadata and atomic 100-request quota. Synthetic records removed. PAID_DB is now bound to the main production Worker; no account activation.
- SES account `715841338924`, `us-east-1`: sending enabled, production access enabled, identity `acquisitioncompanion.com` verified, DKIM signing enabled/SUCCESS with RSA 2048. No existing identity modified.
- Approved `twn-acquisition-staging` SSO role denied `iam:GetUser` for `acquisition-companion-production-ses`. IAM work stopped. The operator subsequently confirmed creation of that separate user and the dedicated inline send-only policy, plus issuance of its credential. No credential was disclosed to or handled by this task. Both SES secret binding names are now verified on the approved isolated private mailer; values were never read or exposed. AUTH_MAIL_ENABLED remains false.
- Stripe CLI was explicitly switched to Thewirednomad LIVE, `acct_1OLU7lKGOtHP6zWl`, after operator authorization. One product, two recurring prices and one Portal configuration were created. No customer, subscription, card or payment was created. The webhook preparation result is recorded below when complete.
- Root production `wrangler.jsonc` now contains the reviewed dormant production bindings, LIVE non-secret catalog IDs and false flags. Existing OpenAI settings and healthy public site assets were preserved. Account/pricing/legal drafts remain local pending review/publication.

## Production SES resource request — administrator action

Create IAM user `acquisition-companion-production-ses` with no console login and this sole inline permission (no staging/unrelated SES/IAM permissions):

```json
{
 "Version":"2012-10-17",
 "Statement":[{
  "Effect":"Allow",
  "Action":"ses:SendEmail",
  "Resource":"arn:aws:ses:us-east-1:715841338924:identity/acquisitioncompanion.com",
  "Condition":{"StringEquals":{"ses:FromAddress":"signin@acquisitioncompanion.com"}}
 }]
}
```

This is SES v2 HTTPS, not SMTP/SendRawEmail. Review permission against [AWS SES IAM guidance](https://docs.aws.amazon.com/ses/latest/dg/control-user-access.html) before issuance. No need to change the verified domain/DKIM or unrelated mail applications. The mailer supplies fixed `ReplyToAddresses: [support@acquisitioncompanion.com]` and a plain-text sign-in template, without tracking. The production origin must be exactly `https://acquisitioncompanion.com`; staging recipient allowlisting and staging-origin rejection remain unchanged.

Do not create an access key until the separately named production mailer exists and an authorized process can pipe the creation result directly into its secret upload without printing/writing credentials. Store `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` only on `acquisition-companion-mailer-production`; never the browser, Git, local env, shell history or public application. Confirm delivery with one explicitly approved operator recipient before auth activation. Domain verification is not proof of successful production mail delivery.

## Live Stripe provisioning gate

Before any creation, obtain owner-authorized live access through normal Stripe login/restricted-secret configuration; never recover staging or unrelated application credentials. Reverify account ID above and `livemode=true` metadata. Then report the exact planned resources for review:

1. One LIVE Product: **Acquisition Companion Deal Lab**.
2. Two LIVE USD recurring Prices: **1900 cents/month**, **19000 cents/year**, one product, no trial/tier.
3. One LIVE Customer Portal configuration for payment updates and cancellation at period end; do not turn on immediate cancellation unless separately approved.
4. One LIVE webhook destination: `https://acquisitioncompanion.com/api/billing/webhook`, initially disabled until the approved activation sequence.

Required events: `customer.subscription.created`, `.updated`, `.deleted`, `invoice.paid`, `invoice.payment_failed`; canonical subscription lookup handles stale event bodies. Keep the proven adapter API version `2025-06-30.basil` and matching webhook version; changing it is a separate compatibility task. Checkout success URLs never grant entitlement. No live customer or real-card validation is authorized. TEST resources stay untouched.

Production code rejects TEST keys/objects/events in explicit production mode, supports restricted live keys, and fails closed on missing billing configuration, storage, expired sessions or entitlement. A live key must grant only the customer/Checkout/Portal operations and subscription reads this adapter needs. Signing secrets are destination-specific. Review the configured Price amount, interval, currency, product, activity and live mode against public copy before setting IDs.

## Tax and US launch eligibility — unresolved review gate

Do not enable `automatic_tax` or create tax registrations automatically. Small beta volume does not establish that no sales tax is due. See [Stripe Tax](https://docs.stripe.com/tax) and the [live checklist](https://docs.stripe.com/get-started/checklist/go-live). The operator/adviser must determine The Wired Nomad LLC's business location, applicable state registrations/nexus, product classification/taxability, expected sales by state and whether Stripe Tax should be used now. Stripe Tax requires applicable registrations; a toggle alone does not settle collection obligations. Configure collection only after that review. No opinion about a universal volume threshold is made here.

Pricing/Terms explicitly position paid beta for US customers. For the initial 5–10-user beta, require operator-approved `paid_beta_checkout` capability plus explicit U.S.-customer attestation before the server creates hosted subscription Checkout. See [operator approval](paid-beta-approval.md). Unapproved accounts cannot create a Checkout Session or Stripe customer. Approval never grants AI access. This manual eligibility process does not independently verify residency; automated geography is deferred until demand is established. Do not invent a shipping requirement for a digital service. This restriction is a launch gate, not a claim that it already exists. UK/EU/other expansion requires separate VAT/GST, consumer-law, privacy and tax review. Public course access remains unrestricted.

## Refunds, cancellation, deletion and failed payments

Owner-approved refund *draft*, still requiring legal review: “Subscription fees are generally non-refundable after access has been used, except where required by applicable law. If you believe you were charged in error or have a billing problem, contact support@acquisitioncompanion.com.” Do not silently turn this into a blanket no-refunds rule or 14-day window. Resolve unused access, mistakes, annual plans and outages. Preserve mandatory rights.

Users may cancel recurring billing at any time in the Portal; access continues to the already-paid period end unless law requires otherwise. Current entitlement code denies past_due/unpaid/canceled/expired states; no invented grace period. Payment recovery restores access only from canonical verified Stripe state. Support verifies account ownership, reviews the issue, performs any approved refund in the LIVE Dashboard, records only necessary billing metadata and reconciles affected access. Refunds do not automatically cancel a subscription: handle and explain each action separately.

For disputes/chargebacks: inspect Stripe's non-content payment evidence and deadline, handle through the Dashboard, never use AI conversation data as evidence. Decide any access policy with legal/owner review. No automated dispute/chargeback entitlement rule is claimed implemented.

Deletion requests go to support. Verify ownership; cancel recurring billing as requested, revoke sessions, remove appropriate account/usage data and document any legally required billing retention. Retention durations, backups, deletion/export procedure and statutory records exceptions must be approved before launch; none are invented here. Authentication cleanup covers expired 15-minute challenges, seven-day sessions, old throttle buckets and customer locks. It does not implement complete account deletion.

## Monitoring and reconciliation

Production candidate enables explicit safe diagnostics without full invocation URLs/bodies. Error metadata contains only internal failure stage, status, workflow/mode, provider code/scope; never Stripe event payloads/signatures, cookies, sign-in fragments, tokens, email, deal data, prompts or answers. Keep account analytics suppressed; do not enable blanket traces/log dumps for auth/billing.

Before launch: name the support operator, review log retention, configure alerts for repeated webhook 5xx, mail failures, stale pending deliveries, entitlement/storage failures and monthly quota/accounting failures. View delivery attempts in Stripe Workbench; signature verification and event deduplication remain required. Do not manually grant entitlement to hide a failed event. Retry only after diagnosis; canonical-state reconciliation protects out-of-order events.

`reconcileCustomer(customer, env)` is an operator-only helper; it fetches current subscriptions under a customer lease and writes application grants atomically. There is no public reconciliation endpoint. Provision and exercise an authorized internal invocation/runbook and an audit record before launch; a scheduled cleanup job is not reconciliation. After a missed event, compare canonical billing state and account mapping, invoke the helper privately, verify one grant, then confirm ordinary API access. Production reconciliation invocation/alerting is **not configured yet**.

## Analytics and usage

100 AI requests per UTC month is the initial paid-beta setting, on either billing interval. User account shows count/remaining and next reset date at 00:00 UTC. Failed model attempts count; denied/invalid/quota-exhausted requests do not. No rollover or unlimited claim. Atomic D1 reservation denies requests before OpenAI when exhausted. Current deterministic worked course examples stay free; paid AI calculation workflows live behind AI entitlement.

Usage storage is metadata only, including internal centrally configured cost estimates. Set model rates from current official OpenAI project/pricing documentation at launch; no fabricated `gpt-5.6-luna` rate is assumed. Reasoning tokens are already a subset of output, never double-counted. Unknown usage/rates remain unknown. Ordinary account responses never expose tokens/internal cost.

GA funnel: `pricing_page_view`, `checkout_started` (predefined monthly/annual only), `ai_paid_request` (predefined mode only) use the existing consent controller. `subscription_started` / `subscription_canceled` have a safe empty-parameter contract but are not emitted by webhooks or account pages: no browser consent exists on server events, and account pages deliberately suppress analytics. Authoritative subscription lifecycle measurement belongs in privacy-safe billing operations; a future consent-aware browser confirmation path needs separate review. No prompts, response, identities or billing IDs enter GA. False master flag preserves existing open AI responses without usage/session storage.

## Exact runtime variables / secrets needed later

Main production Worker (`acquisition-companion`), after approved dormant-code deployment:
- `AI_PAYWALL_ENABLED=false` until explicit final activation; `AUTH_SIGNIN_ENABLED=false` during preparation.
- `PAID_ENVIRONMENT=production`, `BILLING_TEST_MODE=false`, `ACCOUNT_ORIGIN=https://acquisitioncompanion.com`, `AI_ALLOW_TRIALS=false`, `AI_MONTHLY_REQUEST_LIMIT=100`.
- `PAID_DB` → the NEW production D1 above; `AUTH_MAILER` → `acquisition-companion-mailer-production`, named `AuthMailer` entrypoint.
- Secrets: `STRIPE_SECRET_KEY` (dedicated restricted LIVE key), `STRIPE_WEBHOOK_SECRET` (LIVE destination signing secret).
- Variables: `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_PORTAL_CONFIGURATION_ID` (LIVE only), `AI_MODEL_PRICING_JSON` (verified server-only rates); `PAID_DIAGNOSTICS_ENABLED=true` after privacy/log review.
- Preserve existing `AI_ENABLED`, `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, `OPENAI_MODEL` and the same three rate-limit namespaces. Do not copy any staging values.

Separate production mailer (`acquisition-companion-mailer-production`):
- `AUTH_MAIL_ENABLED=false` until verified send/activation; `AUTH_MAIL_DIAGNOSTICS_ENABLED=true` exposes safe failure metadata only; `AUTH_MAIL_MODE=production`, `AUTH_MAIL_PROVIDER=ses`, `SES_REGION=us-east-1`, `AUTH_MAIL_ORIGIN=https://acquisitioncompanion.com`, `AUTH_MAIL_FROM=signin@acquisitioncompanion.com`.
- Only its own new IAM `SES_ACCESS_KEY_ID` / `SES_SECRET_ACCESS_KEY` secrets; optional session token only if the selected credential type actually needs one.

Astro build variables remain separate: `SITE_URL=https://acquisitioncompanion.com`, existing consent-gated `PUBLIC_GA_MEASUREMENT_ID`, existing `NODE_VERSION`. `AI_COURSE_SOURCE_ORIGIN` is optional approved-origin metadata for noindex staging only; normal production uses its canonical. Never make server secrets `PUBLIC_*` or include them in build arguments. Support contact is public project configuration, not a secret.

## Final activation sequence — owner approval required

1. Complete IAM/mail delivery, live Stripe resource/account/mode review, Portal settings, operator approval/U.S. attestation, tax review, legal/refund/privacy/retention/deletion review and monitoring/reconciliation ownership.
2. Approve the diff and publish the reviewed Terms/Privacy. Approve a dormant production release with master/auth flags OFF; integrate the candidate bindings/config into the established Workers Builds path, not a second competing deployment. Verify open AI remains unchanged.
3. Configure production-only secrets/bindings using approved secret storage; verify flags OFF, D1 health, price/mode matching, mailer's locked origin/sender, no secret leakage and no staging bindings. Enable the isolated mailer only for an explicitly approved delivery check; do not enable account collection before policy review.
4. Present the final readiness report and obtain explicit **paid-beta activation** approval. Only then set `AUTH_SIGNIN_ENABLED=true`, enable the LIVE webhook destination, and set `AI_PAYWALL_ENABLED=true` on the existing production Worker. Recheck account/anonymous/entitled/unpaid states and usage denial. If health regresses, turn the master OFF and diagnose; do not improvise data changes.
5. A real-card purchase/refund test needs its own explicit authorization; do not treat activation permission as permission to charge a card. No public launch announcement before approval and checks.

Current recommendation remains **NEEDS PRODUCTION SETUP WORK** until the unresolved gates above pass. Dormant production infrastructure and LIVE catalog provisioning have occurred under the later explicit authorization. No auth/paywall activation, email, customer/subscription creation or real purchase has occurred.

## 2026-10-03 authorized dormant production infrastructure

The isolated private mailer is deployed with both SES secret binding names present, no public targets, and AUTH_MAIL_ENABLED=false. The main Worker now privately binds AuthMailer and the dedicated verified production D1. Existing public site assets were preserved; prepared account/pricing/Terms/Privacy pages remain local pending publication/legal review. Production AI still works anonymously: HTTP 200, three approved course citations, zero browser errors/direct OpenAI requests/axe violations in the focused responsive check. No magic link, real customer, subscription or card was used.

The Stripe CLI was explicitly switched to LIVE for acct_1OLU7lKGOtHP6zWl; TEST resources were untouched. Created one LIVE product and two USD recurring prices plus a Portal configured for cancellation at period end. Non-secret identifiers:
- accountId: `acct_1OLU7lKGOtHP6zWl`
- productId: `prod_VNMAEjAtNzh9BM`
- monthlyPriceId: `price_1UMbSIKGOtHP6zWlL79BlVMm`
- annualPriceId: `price_1UMbSJKGOtHP6zWlHxMkn1PR`
- portalConfigurationId: `bpc_1UMbSKKGOtHP6zWl8VVjqsdd`

STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET must be entered by the operator into secure Wrangler prompts for acquisition-companion. Do not use the expiring CLI credential as the runtime credential. Prefer a dedicated restricted LIVE runtime key permitting Customers read/write, Subscriptions read, Checkout Sessions write and Billing Portal Sessions write. Reverify these scopes against actual Stripe endpoints; no Payments/Charges write or resource administration is needed by the runtime. No key value or webhook secret may be printed or saved locally. All three activation flags remain false.

## Deployment continuity gate

The dormant runtime was deployed directly under owner authorization while preserving the healthy public course assets. This preparation branch is uncommitted/unpushed. Before any later main-branch Workers Build, review and commit the dormant infrastructure changes through the normal workflow; an older main build would otherwise replace the new runtime/bindings. Do not merge paid-staging wholesale. Publish account/pricing/legal assets only after their review, with flags still OFF, before final activation. Current rollback remains the healthy prior version 383778a6-42e8-4412-a7bb-7f1002815597.

## Final dormant provisioning state

Main production version: `f962660d-8ba4-499d-86db-e339945e7224`. Main PAID_DB/AuthMailer bindings and LIVE non-secret price/Portal variables verified; AI_PAYWALL_ENABLED=false, AUTH_SIGNIN_ENABLED=false and AUTH_MAIL_ENABLED=false. Private mailer version remains `e55a5c83-e3ec-4c2a-903f-f42544357671`, disabled. Public /ai/ returns 200 and AI status ready. One anonymous AI request returned 200 with three course citations; no paid access, email, customer, subscription or payment was activated.

LIVE webhook: `we_1UMbYfKGOtHP6zWl06Oxv64A` at https://acquisitioncompanion.com/api/billing/webhook, verified `disabled`, API version 2025-06-30.basil, five reviewed subscription/invoice lifecycle events. Stripe creates this endpoint enabled by default; it was immediately disabled before handoff. Its creation response secret was never printed or written; use the LIVE Dashboard to reveal it and enter only into Wrangler secure prompt. No TEST resources touched. Operator must supply STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on acquisition-companion. Stop at this secure-entry gate; do not enable the webhook, mail, sign-in or paywall.

## Invite-only checkpoint

Initial launch is 5–10 manually approved U.S. customers. Preserve hosted subscription Checkout; do not deploy the rejected SetupIntent/Stripe.js flow or buy Radar. Apply reviewed migration 0002 after checkpoint approval, verify the new approval table remotely with synthetic records only, then use the private [operator approval procedure](paid-beta-approval.md). Approval revocation blocks new Checkout creation but does not cancel paid access. Previously issued hosted Checkout Sessions can remain valid until Stripe expires them; approval revocation is not an automatic cancellation of an existing Session or subscription.

The [retention inventory](paid-retention-review.md) distinguishes credential expiry from unresolved legal retention. Optional usage cleanup defaults to deleting nothing and requires an explicitly reviewed policy; no durations or purge settings are active. Legal/tax/retention/operations approval, secure runtime Stripe key entry, disabled dormant release approval, and final mail/sign-in/paywall activation approval are still distinct gates.

## Dormant release approval / verification

The owner approved the dormant production release with all activation flags false. Both main LIVE Stripe secret names and private mailer SES secret names are verified; values were not read or exported. The pre-release rollback version is 85778d54-fcfe-4a0e-a7b2-db9e3946d980. Migration 0002 is applied remotely; synthetic tests confirmed approval/revocation metadata, server-enforced Checkout eligibility, approval not granting AI and revocation preserving an existing synthetic paid grant. All synthetic rows were removed; no provider/customer/subscription/payment/email was created. These results supersede historical pending-secret/migration descriptions above. The LIVE webhook remains disabled. Final legal/refund/tax/retention/operations review and explicit mail/sign-in/paywall activation remain required.
