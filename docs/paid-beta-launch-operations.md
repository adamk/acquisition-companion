# Paid-beta launch operations and activation gates

Prepared 2026-10-03. **Not launched. Dormant production bindings and LIVE billing resources are now authorized; account/billing/paywall activation and real payments remain prohibited. `AI_PAYWALL_ENABLED=false` remains mandatory until the owner's final explicit approval.** Selling entity: The Wired Nomad LLC. Product/trade names: Acquisition Companion / Acquisition Companion Deal Lab. Initial paid customers: United States only. The public educational site remains free internationally; paid expansion is a separate decision.

## Independent runtime gates

`AI_INTERACTIVE_ENABLED` independently controls whether AI requests can reach OpenAI; it defaults off. `AI_PAYWALL_ENABLED` controls only entitlement enforcement when interactive AI is enabled. `AUTH_SIGNIN_ENABLED` independently controls `/api/auth/*` and `/api/account`; `BILLING_ENABLED` independently controls hosted Checkout and Portal creation. These flags do not grant entitlement. The private mailer independently enforces its own `AUTH_MAIL_ENABLED`; enabling main-worker sign-in cannot bypass that check. `/api/billing/webhook` is independent of these flags and remains protected by the externally enabled/disabled Stripe destination, configured secret, signature validation and canonical Stripe lookup.

| Interactive AI | AI paywall | Sign-in | Billing | Result |
|---|---|---|---|---|
| Off | Either | Off | Off | `/ai/` remains readable; interactive requests stop before OpenAI; auth and billing fail closed. |
| On | Off | Off | Off | Anonymous AI remains open; auth and billing fail closed. |
| On | Off | On | Off | Anonymous AI remains open; auth can operate if D1 and the private mailer are ready; billing is closed. |
| On | Off | On | On | Anonymous AI remains open; authenticated, CSRF-protected, approved, U.S.-attested users can reach hosted Checkout/Portal. |
| On | On | Off | Off | AI requires a valid `ai_deal_lab` entitlement; auth and billing APIs remain unavailable. |

### Future operator SES-only test (not authorized by this document)

For one operator-only, browser-bound production sign-in test while keeping public AI open, set the main Worker to `AI_INTERACTIVE_ENABLED=true`, `AI_PAYWALL_ENABLED=false`, `AUTH_SIGNIN_ENABLED=true`, `BILLING_ENABLED=false`; set only the private mailer to `AUTH_MAIL_ENABLED=true`. Keep the LIVE Stripe destination disabled. Use only the operator's own email, validate the 15-minute single-use flow, then restore mail/sign-in flags and interactive AI to their intended dormant state. This test creates an account/session but no Checkout or entitlement.

### Future controlled $19 purchase (separate explicit approval required)

To test a real operator purchase while leaving anonymous AI open, set main Worker `AI_INTERACTIVE_ENABLED=true`, `AI_PAYWALL_ENABLED=false`, `AUTH_SIGNIN_ENABLED=true`, `BILLING_ENABLED=true`; set private mailer `AUTH_MAIL_ENABLED=true`; keep `BILLING_TEST_MODE=false`; and enable the LIVE webhook destination only for the controlled test. Approve only the authenticated operator account for `paid_beta_checkout`, complete the U.S.-customer attestation and use hosted $19 monthly Checkout. The webhook can grant `ai_deal_lab`; an entitled operator's subsequent AI requests are recorded against that account while anonymous AI remains available. The 100-request blocking quota remains off until `AI_PAYWALL_ENABLED=true`.

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

### What is available now

- **Cloudflare:** the production Wrangler config in this checkout declares `PAID_DIAGNOSTICS_ENABLED=true`; webhook failures emit only a safe stage and HTTP status, without event payloads or secrets. The AI provider-specific diagnostic branch is conditional on the AI paywall being enabled. The production `wrangler.jsonc` has no explicit `observability` block; the separate example config does, which is not proof of production settings. A read-only deployment listing initially failed because Wrangler selected an environment token; unsetting those token variables let the authenticated OAuth request succeed and confirmed version `d55e2f08-47be-466a-ba38-f932057d0e7e` at 100% traffic. The listing does not report log capture, sampling or retention, so those effective settings remain unverified. Before activation, verify Worker Analytics/Logs access and retention in the dashboard rather than assuming the example config applies.
- **Stripe:** the LIVE webhook destination was last verified disabled, and there are no live subscriptions to monitor. No delivery failures exist to inspect while it is disabled. Once the owner enables it, Workbench shows delivery attempts, response codes and resend availability. No automated alert was verified.
- **SES:** the sender identity and DKIM are verified, but auth mail is disabled and no production sign-in email has been sent. The mailer code can emit sanitized `ses_delivery_failure` metadata when `AUTH_MAIL_DIAGNOSTICS_ENABLED=true`; the example config sets this, but effective production log collection was not reverified. The available AWS role previously denied `cloudwatch:ListMetrics`, so SES CloudWatch metrics/alerts were not verified. Do not expand IAM permissions in this run.
- **OpenAI and quota:** the deployed public AI status endpoint is currently ready. Paid provider diagnostics are emitted only on the paywalled AI path, so they will not show the full paid diagnostic event while the master paywall is off. Quota exhaustion returns HTTP 429 `monthly_limit` before an OpenAI call, but does not create a dedicated alert. The metadata-only monthly account is the usage source of record.

For a 5–10-customer beta, use the existing Cloudflare, Stripe and AWS dashboards plus the private D1 operator procedure below; do not add a new monitoring service. **Before the first real purchase, the operator must verify access to Cloudflare production Worker logs/errors, Stripe webhook delivery history once the destination is enabled, and AWS SES send/bounce status. If any are unavailable, stop before purchase.** Retain only the minimum logs needed to diagnose incidents and never enable body/header dumps for auth or billing.

**After each first-time purchase:** confirm the Stripe object is LIVE and uses the approved monthly/annual price; find the signed webhook delivery and require a successful HTTP response; verify one customer mapping, one subscription row and one derived `ai_deal_lab` entitlement; check the account view and usage policy; confirm hosted Portal access. Do not treat Checkout success-page navigation as proof of payment.

**Daily while beta accounts are active:** review Stripe failed/pending webhook attempts; Cloudflare Worker error rate and safe paid failure-stage logs; SES send/reject/bounce indicators; reported OpenAI failures and `/api/ai/status`; and metadata-only monthly request counts/quota responses. Investigate a 429 only as a quota outcome unless the user reports a mismatch. No prompts, answers, deal facts, tokens, cookies, email-link fragments or payment data belong in telemetry.

**Customer says they paid but cannot access:** verify the account email through the support channel and the LIVE Checkout Session/customer/subscription in Stripe; compare its `client_reference_id` and Customer `ac_user_id` to the existing D1 UUID; inspect mapping, subscription, webhook marker and customer lock using the read-only queries below. If identity and approved price/status match, use the conditional missing-mapping correction only if the field is `NULL`, then resend the legitimate signed event. Confirm a single canonical subscription row and the ordinary account/AI access state. If identity conflicts, the event is no longer resendable, Stripe state cannot be read, or reconciliation still disagrees, keep the paywall off and escalate to the owner; do not manually grant access.

### Production webhook reconciliation (no admin endpoint)

The existing signed webhook is the executable reconciliation path: it validates the Stripe signature, deduplicates event IDs, takes a per-customer lease, retrieves the current subscription directly from Stripe and atomically upserts the subscription row plus processed-event marker. Subscription UPSERT also corrects `user_id` from the verified customer mapping. `reconcileCustomer(customer, env)` can fetch the canonical full subscription list, but has no operator invocation interface; do not expose it publicly. For the initial beta, replaying an existing signed Stripe event is the recovery mechanism. **If no legitimate event remains available to resend, STOP AND ESCALATE. Do not manually insert or edit entitlement or subscription state.**

Use Stripe LIVE Dashboard/Workbench and production D1 only after an incident is authorized. Before editing, verify in Stripe: LIVE mode and account; customer ID; customer metadata `ac_user_id`; the relevant Checkout Session `client_reference_id`; subscription ID/customer/status/current period/price/cancel-at-period-end; and event ID/type/delivery history. Match the account UUID to the existing D1 user. Do not copy card or payment details. Validate identifiers before interpolating them in Wrangler SQL: account UUID, `cus_…`, `sub_…`, and `evt_…` characters only. Run commands from the production checkout with the named database and `--remote`; do not use staging IDs.

Read-only checks (select only non-content billing metadata):

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,CASE WHEN stripe_customer_id='cus_REPLACE' THEN 1 ELSE 0 END AS mapped_to_customer FROM users WHERE id='USER_UUID';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id FROM users WHERE stripe_customer_id='cus_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,user_id,status,valid_until,cancel_at_period_end,observed_at FROM subscriptions WHERE id='sub_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,processed_at FROM webhook_events WHERE id='evt_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT customer_id,expires_at FROM billing_locks WHERE customer_id='cus_REPLACE';"
```

For **a verified Stripe customer missing its D1 mapping**, first establish the same account UUID from the Stripe customer metadata and Checkout Session, confirm that user exists in D1 and has no different customer mapping, and confirm no other D1 user owns this customer. If any identity conflicts, stop. Save the pre-change mapping state. Only when `stripe_customer_id IS NULL`, make this conditional correction:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE users SET stripe_customer_id='cus_REPLACE' WHERE id='USER_UUID' AND stripe_customer_id IS NULL;"
```

Require exactly one changed row, then reread the mapping. Never replace a non-null mapping by guess, create a user to fit Stripe metadata, or use metadata alone when the Checkout Session/account evidence disagrees.

Choose the exact existing signed event for the subscription: `customer.subscription.created`, `.updated` or `.deleted`; `invoice.paid` and `invoice.payment_failed` also resolve the linked subscription. Prefer the latest relevant event. If it has no `webhook_events` row, use Stripe Workbench's normal **resend** to the production webhook after verifying the endpoint is intentionally enabled for incident recovery. If the event is already marked processed but its D1 subscription row is missing/stale, save the exact `processed_at`, ensure no unexpired customer lock exists, then remove only that event's deduplication marker so the same signed resend can reach canonical reconciliation:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "DELETE FROM webhook_events WHERE id='evt_REPLACE' AND processed_at=PROCESSED_AT_REPLACE;"
```

Require exactly one deletion when a marker was observed, then immediately resend that same event. Do not delete a marker for a healthy duplicate. The customer lock and second dedupe check serialize concurrent retries; the canonical GET, not the old event body, determines current access. After a successful 2xx delivery, reread the event marker, customer mapping and subscription row. Confirm it is represented once and derive entitlement with the normal account/API check; do not insert an entitlement manually. Keep the AI paywall off while correcting any mapping.

Recovery cases:

- **Customer paid, mapping missing:** verify LIVE Customer `ac_user_id` and Checkout Session `client_reference_id` agree with the authenticated D1 account; conditionally map as above; resend the relevant signed event.
- **Active subscription but no grant / stale state:** verify current canonical Stripe status, price and period; resend the newest relevant event. If its idempotency marker already exists, use the narrowly conditional marker removal above first. Canonical reconciliation may update or recreate the subscription row; access still depends on `active` and unexpired state.
- **Duplicate event:** if the event marker exists and its D1 row is correct, resend is acknowledged as `duplicate` with no additional row or grant. Do not clear a healthy marker.
- **Cancellation:** resend the newest subscription update/deleted event; `cancel_at_period_end` retains access only through the paid period, while canonical canceled/expired state denies access.
- **Failed payment / recovery:** resend the corresponding `invoice.payment_failed` or `invoice.paid` event and inspect the canonical subscription status. The handler does not infer entitlement solely from an invoice: a subscription still `active` remains governed by its actual Stripe status; `past_due`/`unpaid` do not qualify.

**Rollback of an operator mapping correction:** this procedure only permits a correction from `NULL`, so preserve that before-value and the observed subscription snapshot (IDs/status/timestamps only). If the mapping was assigned to the wrong account and no event was resent yet, reverse only that exact assignment:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE users SET stripe_customer_id=NULL WHERE id='USER_UUID' AND stripe_customer_id='cus_REPLACE';"
```

Require one changed row and reread it. If a replay already ran under the wrong mapping, do not hand-edit or create a subscription/grant: pause further resends, verify the true mapping from Stripe and the account record, clear only the affected event's marker using its exact `processed_at`, and replay the legitimate signed event so the canonical UPSERT assigns ownership from the verified mapping. Confirm the unintended account no longer has an eligible row and the correct account has the canonical row. If you cannot prove the before/after identity or no valid event is resendable, leave the paywall off and escalate; never manufacture a subscription row.

## Analytics and usage

100 AI requests per UTC month is the initial paid-beta setting, on either billing interval. User account shows count/remaining and next reset date at 00:00 UTC. Failed model attempts count; denied/invalid/quota-exhausted requests do not. No rollover or unlimited claim. Atomic D1 reservation denies requests before OpenAI when exhausted. Current deterministic worked course examples stay free; paid AI calculation workflows live behind AI entitlement.

Usage storage is metadata only, including internal centrally configured cost estimates. Set model rates from current official OpenAI project/pricing documentation at launch; no fabricated `gpt-5.6-luna` rate is assumed. Reasoning tokens are already a subset of output, never double-counted. Unknown usage/rates remain unknown. Ordinary account responses never expose tokens/internal cost.

GA funnel: `pricing_page_view`, `checkout_started` (predefined monthly/annual only), `ai_paid_request` (predefined mode only) use the existing consent controller. `subscription_started` / `subscription_canceled` have a safe empty-parameter contract but are not emitted by webhooks or account pages: no browser consent exists on server events, and account pages deliberately suppress analytics. Authoritative subscription lifecycle measurement belongs in privacy-safe billing operations; a future consent-aware browser confirmation path needs separate review. No prompts, response, identities or billing IDs enter GA. With interactive AI enabled and the paywall off, anonymous and non-entitled AI remains open and unmetered; only requests tied to a valid session and current paid entitlement create paid usage metadata.

## Exact runtime variables / secrets needed later

Main production Worker (`acquisition-companion`), after approved dormant-code deployment:
- `AI_INTERACTIVE_ENABLED=false`, `AI_PAYWALL_ENABLED=false`, `AUTH_SIGNIN_ENABLED=false`, `BILLING_ENABLED=false` during preparation; keep the paywall off through a controlled purchase unless/until entitlement enforcement is separately approved.
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
4. Present the final readiness report and obtain explicit authorization for each live action. For an operator-only purchase while anonymous AI remains open, set `AI_INTERACTIVE_ENABLED=true`, `AI_PAYWALL_ENABLED=false`, `AUTH_SIGNIN_ENABLED=true`, `BILLING_ENABLED=true`, and private-mailer `AUTH_MAIL_ENABLED=true`, then enable the LIVE webhook destination and approve only the operator. Test and then restore sign-in/billing/mail/interactive state as intended. Enabling `AI_PAYWALL_ENABLED=true` is a separate later decision that requires explicit approval; recheck anonymous/entitled/unpaid/quota states then. If health regresses, turn the relevant gate off and diagnose; do not improvise data changes.
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
