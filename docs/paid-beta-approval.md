# Legacy beta Checkout approval and production webhook reconciliation

> **HISTORICAL/LEGACY:** Per-account `paid_beta_checkout` approval is no longer required for the public U.S. paid beta. Do not follow the manual approval steps below for new customers. The table, migration and historical operator records remain for audit. The webhook reconciliation procedure remains current.

This procedure uses the production `acquisition-companion-paid-production` D1 database and the current main Worker `wrangler.jsonc`. Do not use staging storage or create an account to bypass sign-in. Checkout approval and AI entitlement are distinct: `paid_beta_checkout` only permits an eligible Checkout attempt; only canonical, verified active Stripe subscription state grants `ai_deal_lab`.

## Historical manual approval procedure — do not use for new customers

1. Customer must be 18 or older, able to sign in, request beta access and affirm that they are a U.S. customer. Do not use IP geolocation as proof or request identity documents, tax IDs, payment information or deal materials.
2. Verify the account through the customer's authenticated session. In the private production D1 console, confirm exactly one account matches. Use its UUID locally; do not copy email, session, challenge or cookie values into notes or commands.
3. Replace `ACCOUNT_UUID` with that verified UUID and `OPERATOR_LABEL` with a short accountable label. Use a prepared/quoted value, not untrusted user input in a shell command.

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "INSERT INTO beta_checkout_approvals(user_id,approved_at,approved_by) SELECT id,unixepoch()*1000,'OPERATOR_LABEL' FROM users WHERE id='ACCOUNT_UUID' AND EXISTS(SELECT 1 FROM sessions WHERE user_id=users.id AND expires_at>unixepoch()*1000) ON CONFLICT(user_id) DO UPDATE SET approved_at=excluded.approved_at,approved_by=excluded.approved_by,revoked_at=NULL,revoked_by=NULL;"
```

4. Read back only that account's approval and confirm one row is active. Confirm no customer mapping, subscription or `ai_deal_lab` entitlement was created. If zero or multiple accounts match, stop.
5. Customer reloads `/account/` or `/pricing/`, selects a plan, and completes the required explicit U.S.-customer attestation in hosted Checkout. Do not create a Checkout Session for them outside the authenticated, same-origin, CSRF-protected browser flow.

## Revoke Checkout approval

Revocation prevents a new Checkout attempt; it does not cancel an existing subscription or remove paid access. Record the operator label and timestamp. Preserve the approval audit row for up to 12 months after revocation/account closure, then remove it manually if no specific need remains.

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE beta_checkout_approvals SET revoked_at=MAX(unixepoch()*1000,approved_at),revoked_by='OPERATOR_LABEL' WHERE user_id='ACCOUNT_UUID' AND revoked_at IS NULL;"
```

Read back the account's status. Do not edit subscription or entitlement rows to revoke Checkout approval.

## Production webhook reconciliation

The existing signed webhook is the recovery mechanism; there is no public admin endpoint. It verifies the Stripe signature, deduplicates event IDs, acquires a per-customer lease, retrieves canonical subscription state from Stripe, and atomically records the event/subscription state. A valid signed event for a Stripe customer that successfully has no Acquisition Companion user mapping is acknowledged as ignored/non-AC and makes no billing write. A D1 lookup error remains an unavailable failure.

Use this only for an understood incident. Keep the AI paywall in its intended state and do not change a subscription or entitlement by hand.

### Verify identity and state first

In Stripe LIVE, confirm the correct account/mode, exact Acquisition Companion product and price, Customer ID, customer `ac_user_id`, Checkout `client_reference_id`, Subscription ID/status/current period/cancel-at-period-end, event ID/type/delivery history, and any unpaid invoice/dispute. Match the account UUID with the existing D1 user. Never inspect or record card data.

In production D1, use SELECT-only queries first:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,CASE WHEN stripe_customer_id='cus_REPLACE' THEN 1 ELSE 0 END AS mapped_to_customer FROM users WHERE id='USER_UUID';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id FROM users WHERE stripe_customer_id='cus_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,user_id,status,valid_until,cancel_at_period_end,observed_at FROM subscriptions WHERE id='sub_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT id,processed_at FROM webhook_events WHERE id='evt_REPLACE';"
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "SELECT customer_id,expires_at FROM billing_locks WHERE customer_id='cus_REPLACE';"
```

Validate substituted identifiers locally: account UUID, `cus_…`, `sub_…` and `evt_…` characters only. Do not use staging IDs.

### Missing customer mapping

If the Stripe Customer and Checkout metadata both prove the same existing D1 account, verify that the account's `stripe_customer_id` is `NULL` and no other D1 user owns that Customer ID. Save the before-state. Only then set a NULL mapping conditionally:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE users SET stripe_customer_id='cus_REPLACE' WHERE id='USER_UUID' AND stripe_customer_id IS NULL;"
```

Require exactly one changed row and reread the mapping. Never overwrite a non-NULL mapping, create a user to fit Stripe metadata, or use metadata when the Checkout account evidence disagrees. If the update was wrong and no event has been replayed, reverse only that exact assignment:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "UPDATE users SET stripe_customer_id=NULL WHERE id='USER_UUID' AND stripe_customer_id='cus_REPLACE';"
```

Require one row and recheck. If an event replay already ran under a wrong mapping, stop further resends and escalate; do not patch subscription rows manually.

### Replay and recovery cases

- Select the latest legitimate signed event for the subscription: `customer.subscription.created`, `.updated` or `.deleted`. `invoice.paid` and `invoice.payment_failed` also trigger canonical subscription lookup. The event body does not decide entitlement; current Stripe state does.
- If the event marker is absent, resend only that existing event from Stripe Workbench after confirming the production endpoint is enabled and the identity is correct.
- If the marker exists but the subscription row is missing/stale, save its exact `processed_at`, confirm no unexpired customer lock exists, then delete only that one idempotency marker and immediately resend the same legitimate event:

```sh
npx wrangler d1 execute acquisition-companion-paid-production --remote --config wrangler.jsonc --command "DELETE FROM webhook_events WHERE id='evt_REPLACE' AND processed_at=PROCESSED_AT_REPLACE;"
```

Require exactly one deleted marker, then resend that event. Do not clear a healthy duplicate marker. If no legitimate resendable signed event exists, **STOP AND ESCALATE**; never manufacture event, subscription or entitlement state.
- **Duplicate event:** a healthy event marker is retained; replay must be harmless and no row should duplicate.
- **Cancellation:** verify period-end flag and paid-through time; resend the latest subscription update/deleted event if local state is stale. Period-end cancellation remains active through the paid period.
- **Past due/failed payment:** verify the latest invoice and canonical subscription status; resend the legitimate `invoice.payment_failed` or `invoice.paid` event. An invoice event alone does not grant entitlement if the canonical subscription is ineligible.

After successful HTTP response, reread mapping, one event marker and the canonical subscription row. Verify the account entitlement through the application. Do not insert a subscription or entitlement manually. Leave D1 unchanged and escalate if identifiers, mapping, signature delivery or canonical state do not reconcile.
