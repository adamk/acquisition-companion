# Invite-only U.S. paid beta — operator procedure

Initial target: 5–10 manually approved U.S. customers. The public course remains free globally; pricing may be public. All activation flags stay false during preparation. This document authorizes no approval, migration, email, subscription or charge by itself.

## Eligibility and entitlement are different

- `paid_beta_checkout` is an application capability backed by `beta_checkout_approvals` in PAID_DB. Only a non-revoked, non-future approval allows Checkout.
- `/api/billing/checkout` requires authentication, same-origin JSON, session-bound CSRF, operator approval and the exact boolean `usCustomerAttested: true`. A missing approval table or failed lookup denies Checkout before any Stripe API call.
- `ai_deal_lab` is still derived solely from canonical eligible active Stripe subscription state. Approval cannot grant it; approval revocation cannot cancel a subscription or remove already-paid access.
- Preserve Stripe-hosted `mode=subscription` Checkout, approved price IDs, its payment authentication, signed webhooks, canonical reconciliation and idempotency. No SetupIntent flow, Stripe.js, Radar upgrade, identity-document storage or IP-based residency determination.
- The customer attests they are a U.S. customer on each Checkout creation. The operator confirms eligibility directly before approval. Neither attestation nor billing/IP data is represented as independent proof of residency. Revisit automated eligibility after the beta establishes demand.

## Migration and preparation

Migration `0001_paid_access.sql` is already verified on production. **Migration `0002_paid_beta_checkout.sql` is now applied and remotely verified on the dedicated production database.** It adds a table; it never grants any account approval. Do not edit or rerun migration 0001. Keep production mail/sign-in/paywall disabled.

After approval, in the production preparation checkout, verify `wrangler.jsonc` targets Worker `acquisition-companion`, database `acquisition-companion-paid-production`, ID `fd456ea3-644c-4867-8089-5197378de990`. Use the normal authenticated Wrangler session, not a staging database or secret copied into commands.

```sh
npx wrangler d1 migrations apply acquisition-companion-paid-production --remote --config wrangler.jsonc
```

## Approve one authenticated account (after launch authorization)

1. Customer signs in using the approved production email flow. They contact support@acquisitioncompanion.com from the account email and explicitly confirm U.S.-customer eligibility. Do not request passports, tax identifiers, payment details or deal material. This is a small manually reviewed beta, not automated residency verification.
2. Look up the single existing account in D1 by that email using the private operator console. Confirm an unexpired authenticated session exists. Do not copy session/token values. Record only its UUID for the next commands.
3. Replace `ACCOUNT_UUID` below with that exact account UUID and `OPERATOR_LABEL` with a short accountable operator label. No user-controlled strings should be interpolated into shell commands. Run one approval statement:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "INSERT INTO beta_checkout_approvals(user_id,approved_at,approved_by) SELECT id,unixepoch()*1000,'OPERATOR_LABEL' FROM users WHERE id='ACCOUNT_UUID' AND EXISTS(SELECT 1 FROM sessions WHERE user_id=users.id AND expires_at>unixepoch()*1000) ON CONFLICT(user_id) DO UPDATE SET approved_at=excluded.approved_at,approved_by=excluded.approved_by,revoked_at=NULL,revoked_by=NULL;"
```

4. Read back exactly that row (`user_id`, approval timestamp/operator and revocation status), verify one affected account and no subscription/entitlement creation. If zero rows changed, stop; do not create an account to bypass sign-in.
5. Customer reloads `/account/` or `/pricing/`. They see approval, explicitly attest U.S. eligibility, then choose the $19 monthly or $190 annual plan. Only signed canonical billing reconciliation can activate AI access. Real purchases still require launch authorization.

## Revoke Checkout approval

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE beta_checkout_approvals SET revoked_at=MAX(unixepoch()*1000,approved_at),revoked_by='OPERATOR_LABEL' WHERE user_id='ACCOUNT_UUID' AND revoked_at IS NULL;"
```

Read back that account's approval status. Existing subscription, billing portal and paid access remain unchanged. Cancellation/refunds are separate authorized billing operations. Do not overwrite subscription rows or grant entitlement manually.

The table keeps the latest approval decision and optional revocation timestamp/operator, not identity documents or a full correspondence archive. Reapproval replaces that latest decision. Retention/deletion policy remains for legal/operations review; no approval purge runs automatically.

## Minimum runtime Stripe key permissions

| Stripe API area | Read | Write | Runtime use |
|---|---|---|---|
| Customers | Included in Write; no separate GET currently | Yes | Create a mapped customer if absent |
| Checkout Sessions | No separate retrieval | Yes | Create hosted subscription Checkout with server-selected price |
| Customer Portal | No configuration retrieval | Yes | Create a hosted portal session using configured ID |
| Subscriptions | Yes | No | Retrieve canonical subscription and list for operator reconciliation |
| Products, Prices, Portal configuration administration, Webhook administration | No | No | IDs configured outside runtime |
| SetupIntents, PaymentMethods, PaymentIntents, Charges, Refunds, Invoices, Radar | No | No | Not called by runtime; invoice events are locally signature-verified |

Approval and attestation add no Stripe permissions. Refunds and cancellation use the reviewed Dashboard/Portal operations, not a runtime key expansion. Verify Stripe's restricted-key permission dependencies at key creation; do not broaden for an unimplemented flow.

## Secure runtime secret entry — operator only

Run from `/private/tmp/acquisition-companion-paid-production`. These commands target only the main production Worker `acquisition-companion` using `wrangler.jsonc`; values go into secure interactive prompts, never command arguments, files or chat. Approval and attestation do not require new Stripe key scopes. Entry must not change any activation flag.

```sh
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_API_KEY -u CLOUDFLARE_EMAIL PATH=/Users/adamk/.nvm/versions/node/v22.23.0/bin:/usr/bin:/bin:/usr/sbin:/sbin npx wrangler secret put STRIPE_SECRET_KEY --name acquisition-companion --config wrangler.jsonc
env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_API_KEY -u CLOUDFLARE_EMAIL PATH=/Users/adamk/.nvm/versions/node/v22.23.0/bin:/usr/bin:/bin:/usr/sbin:/sbin npx wrangler secret put STRIPE_WEBHOOK_SECRET --name acquisition-companion --config wrangler.jsonc
```

After the operator confirms both commands succeeded, inspect only the secret binding names and false flags. Do not retrieve or export their values. The operator confirmed entry of both LIVE secrets; only their binding names and false flags were verified.
