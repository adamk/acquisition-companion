# Manual account closure and deletion requests

There is no self-service deletion endpoint. Handle each request through support@acquisitioncompanion.com. This is an operator procedure for the production `acquisition-companion-paid-production` D1 database; use the current approved production configuration and never a staging database.

## 1. Verify and resolve first

1. Verify account ownership through an already-authenticated account or a sign-in challenge sent to the address on file. Do not ask for a passport, tax ID, payment-card data or deal material. Keep the requester's address and account UUID in the private support workflow only.
2. Run the read-only checks below and review the exact account, subscriptions, paid-through state, approval and usage months. In Stripe LIVE, verify the mapped customer, subscription, renewal/cancellation state, outstanding invoice/refund and any dispute or chargeback. Do not use shared-account totals.
3. If any subscription is active, trialing, past due, unpaid, scheduled to cancel at period end, has a future paid-through date, or has an unresolved invoice, refund or dispute, stop. Help the customer resolve or cancel recurring billing first. Preserve the mapping and keep the LIVE webhook enabled until all required lifecycle events are processed. Cancellation does not itself delete the account.
4. Once billing is resolved, decide which account/billing references must remain for accounting, tax, billing disputes, fraud prevention, chargebacks or other applicable legal obligations. Write down the specific reason and the expected review point. Do not invent a statutory retention date.

## 2. Read-only before-state checks

Substitute the verified account UUID locally. The queries return counts/state, not email, token, session or card data.

```sql
SELECT COUNT(*) AS matching_user_rows,
       SUM(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 ELSE 0 END) AS mapped_customer_rows
FROM users WHERE id = 'VERIFIED_USER_UUID';

SELECT status, cancel_at_period_end,
       datetime(valid_until / 1000, 'unixepoch') AS paid_through_utc,
       observed_at
FROM subscriptions WHERE user_id = 'VERIFIED_USER_UUID'
ORDER BY observed_at DESC;

SELECT COUNT(*) AS active_checkout_approvals
FROM beta_checkout_approvals
WHERE user_id = 'VERIFIED_USER_UUID' AND revoked_at IS NULL;

SELECT month, request_count
FROM monthly_usage WHERE user_id = 'VERIFIED_USER_UUID'
ORDER BY month;

SELECT COUNT(*) AS session_rows
FROM sessions WHERE user_id = 'VERIFIED_USER_UUID';

SELECT COUNT(*) AS pending_challenges
FROM auth_challenges
WHERE email = (SELECT email FROM users WHERE id = 'VERIFIED_USER_UUID');

SELECT COUNT(*) AS unfinished_usage_events
FROM usage_events
WHERE user_id = 'VERIFIED_USER_UUID' AND (success IS NULL OR completed_at IS NULL);
```

Record the safe before-state counts and subscription status/paid-through date in the private support record. If the user mapping is absent or duplicated, any usage event is unfinished, or any state conflicts, stop and escalate. Do not silently delete an in-flight event as part of account closure.

## 3. Close sign-in and remove data no longer needed

After the checks pass and billing is resolved, use one transactional D1 batch, not separate line-by-line mutations. D1 batch executes statements sequentially and rolls the batch back if a statement fails ([Cloudflare D1 batch documentation](https://developers.cloudflare.com/d1/worker-api/d1-database/)). Use the Cloudflare D1 console's multi-statement batch or another approved D1 batch client. If the chosen interface cannot guarantee a single transactional batch, do not perform the mutations there.

Replace the placeholders privately with the exact verified UUID, current account email and short operator label. Use a unique non-deliverable tombstone address derived from that UUID. This removes the email from the active account while preserving a minimal referenced row if approved billing or retention records still depend on it.

```sql
DELETE FROM sessions
WHERE user_id = 'VERIFIED_USER_UUID'
  AND EXISTS (SELECT 1 FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = 'VERIFIED_USER_UUID'
      AND (s.status IN ('active','trialing','past_due','unpaid')
           OR s.valid_until > CAST(strftime('%s','now') AS INTEGER) * 1000)
  );

DELETE FROM auth_challenges
WHERE email = 'VERIFIED_CURRENT_EMAIL'
  AND EXISTS (SELECT 1 FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = 'VERIFIED_USER_UUID'
      AND (s.status IN ('active','trialing','past_due','unpaid')
           OR s.valid_until > CAST(strftime('%s','now') AS INTEGER) * 1000)
  );

UPDATE beta_checkout_approvals
SET revoked_at = MAX(approved_at, CAST(strftime('%s','now') AS INTEGER) * 1000),
    revoked_by = 'OPERATOR_LABEL'
WHERE user_id = 'VERIFIED_USER_UUID' AND revoked_at IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = 'VERIFIED_USER_UUID'
      AND (s.status IN ('active','trialing','past_due','unpaid')
           OR s.valid_until > CAST(strftime('%s','now') AS INTEGER) * 1000)
  );

-- Include only if detailed events are no longer needed for support/accounting
-- and no specific retention hold applies. Current monthly_usage is not deleted.
DELETE FROM usage_events
WHERE user_id = 'VERIFIED_USER_UUID'
  AND success IS NOT NULL AND completed_at IS NOT NULL
  AND EXISTS (SELECT 1 FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL')
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = 'VERIFIED_USER_UUID'
      AND (s.status IN ('active','trialing','past_due','unpaid')
           OR s.valid_until > CAST(strftime('%s','now') AS INTEGER) * 1000)
  );

UPDATE users
SET email = 'closed+VERIFIED_USER_UUID@account.invalid'
WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL'
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = 'VERIFIED_USER_UUID'
      AND (s.status IN ('active','trialing','past_due','unpaid')
           OR s.valid_until > CAST(strftime('%s','now') AS INTEGER) * 1000)
  );
```

Do not delete `monthly_usage`: the current UTC month is protected, and other aggregates follow the 13-month policy. Leave `auth_attempts` to its approximately 24-hour expiry cleanup because it is keyed by an email hash. Let billing locks expire normally. Do not delete or rewrite canonical `subscriptions`, `users.stripe_customer_id` or global `webhook_events` in this batch; keep any such references only while a documented billing, idempotency or legal purpose remains. Never manually create subscription or entitlement state. A later hard deletion of a tombstone with retained foreign-key records requires a separate reviewed retention operation; never hand-delete Stripe subscription state to force a user-row deletion.

## 4. Verify after-state and tell the requester

Run these read-only checks after the batch:

```sql
SELECT COUNT(*) AS active_email_rows
FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'VERIFIED_CURRENT_EMAIL';

SELECT COUNT(*) AS tombstone_rows
FROM users WHERE id = 'VERIFIED_USER_UUID' AND email = 'closed+VERIFIED_USER_UUID@account.invalid';

SELECT COUNT(*) AS session_rows FROM sessions WHERE user_id = 'VERIFIED_USER_UUID';

SELECT COUNT(*) AS old_email_challenges
FROM auth_challenges WHERE email = 'VERIFIED_CURRENT_EMAIL';

SELECT COUNT(*) AS active_checkout_approvals
FROM beta_checkout_approvals WHERE user_id = 'VERIFIED_USER_UUID' AND revoked_at IS NULL;

SELECT status, cancel_at_period_end,
       datetime(valid_until / 1000, 'unixepoch') AS paid_through_utc
FROM subscriptions WHERE user_id = 'VERIFIED_USER_UUID';
```

Expected: no active email row, one inaccessible tombstone if dependent records remain, no sessions or old-email challenges, no active Checkout approval, and subscription state unchanged. If any check differs, stop; do not rerun or improvise. Confirm completion to the requester and explain any limited billing/approval/usage metadata retained and why. Stripe, OpenAI, AWS SES, Cloudflare and other processors hold separate records; this local procedure does not delete those records.
