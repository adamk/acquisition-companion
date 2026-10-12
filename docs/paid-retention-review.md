# Paid-access data retention and cleanup policy

**Status:** Owner-approved policy for the live public U.S.-only paid beta. This records the selected operating policy; it is not a claim of attorney review or legal advice. Account closure remains a manual operator process. There is no public account-deletion endpoint.

## Data inventory

| Table | Fields and purpose | Needed while active | Expiry/deletion behavior |
|---|---|---|---|
| `users` | UUID, email, creation time and optional Stripe customer ID; account and canonical customer mapping | Yes, while the account and billing relationship are active | No automatic deletion. After closure, remove or pseudonymize direct account information unless a specific billing, accounting, tax, dispute, fraud, chargeback or legal need justifies retaining it. |
| `auth_challenges` | Token hash, browser-binding hash, email and expiry; one-time browser-bound sign-in | Only while a sign-in is pending | 15-minute validity; consumed once; expired challenges are cleaned by the scheduled handler. |
| `sessions` | Session-token hash, user UUID, CSRF hash and expiry | While signed in | Seven-day validity unless signed out/revoked; logout and scheduled expiry cleanup remove rows. |
| `auth_attempts` | Email hash, UTC hour bucket and attempt count; resend abuse control | Temporary | Scheduled cleanup removes buckets older than approximately 24 hours. |
| `billing_locks` | Stripe customer ID, owner UUID and expiry; serializes webhook reconciliation | Only during a short reconciliation | A 60-second lease is released after use or removed at expiry. |
| `subscriptions` | Stripe subscription ID, user UUID, canonical status, paid-through time, cancellation-at-period-end flag and observation time | While needed for entitlement, billing support and reconciliation | No automatic cleanup. After closure, retain only as long as a documented accounting, tax, billing-dispute, fraud, chargeback or legal need remains. Never manufacture or edit canonical state to delete an account. |
| `webhook_events` | Stripe event ID and processed timestamp; duplicate-event protection | While needed for idempotency and billing reconciliation | No automatic cleanup. Event IDs are global and not linked to an application user. Keep while needed to prevent replay; do not clear healthy markers during account closure. |
| `beta_checkout_approvals` | Historical user UUID, approval/revocation timestamps and operator labels; audit of the prior invite-only flow | Only while historical approval is active | New public Checkout does not use these rows. Retain historical active records while the account is active; after revocation or account closure, retain for up to 12 months for beta operations/audit, then remove manually if no specific need remains. No identity documents are stored. |
| `usage_events` | Event UUID, user UUID, request timestamp, completion timestamp, UTC month, workflow/model labels, success, latency, token counts and internal estimated cost; quota/accounting/reliability | Needed for request accounting and recent support | Completed events are retained for 90 days after completion when cleanup is later enabled. `success IS NULL` or missing `completed_at` records are never removed by this cleanup. No prompt, response, deal fact or conversation content is stored. |
| `monthly_usage` | User UUID, UTC month, request count, estimated cost and unknown-cost count; atomic quota and accounting aggregate | Current month is required for quota enforcement | Retain 13 months total: current UTC month plus the preceding 12 months. Current month is always protected. An aggregate is not removed while any detailed event for that user/month remains. |

The application does not store card information. Stripe, OpenAI, AWS SES and Cloudflare may separately retain information under their own policies. `ai_deal_lab` entitlement is derived from canonical subscription state; it is not a separately stored entitlement row.

The dedicated SES delivery diagnostic log stores only event timestamp, SES event type and SES MessageId, with a 14-day CloudWatch Logs retention. Its EventBridge transformer excludes recipient addresses, headers, subject and body. Application operational diagnostics are restricted to allowlisted stages and random correlation IDs; do not add raw request or provider payloads.

## Usage cleanup behavior

The code supports the owner-approved values:

```text
PAID_USAGE_RETENTION_DAYS=90
PAID_MONTHLY_USAGE_RETENTION_MONTHS=13
```

Cleanup remains **disabled** unless `PAID_RETENTION_POLICY_APPROVED=true` and at least one valid positive retention period is configured. In the live production environment, `PAID_RETENTION_POLICY_APPROVED`, `PAID_USAGE_RETENTION_DAYS` and `PAID_MONTHLY_USAGE_RETENTION_MONTHS` remain unset. These variables are not being enabled by this release. No production purge is run here.

Detailed-event age uses `completed_at`, not request reservation time. Additive migration `0003_paid_usage_completion_time.sql` adds that timestamp. For already-completed rows without it, the migration starts a conservative 90-day period at migration time (or the later recorded request time); it does not delete rows. In-flight/unfinished records are protected. The 90-day deletion uses a strict older-than cutoff. The 13-month aggregate window retains the current UTC month plus the preceding 12 months, using UTC month keys. It protects the current month and leaves an aggregate while any detailed event for that month remains. Monthly quota state cannot be erased before its retention period.

The Worker scheduled handler invokes usage cleanup only when the paywall state is active and the explicit retention approval/configuration is present. This release does not set those runtime values and does not run the purge. When the owner separately authorizes activation, verify the exact effective cleanup variables before the first scheduled deletion and review its expected affected-row counts first.

Expired authentication cleanup is separate from paid-usage retention. Account, subscription, webhook and beta-approval rows are excluded from scheduled usage cleanup.

## Account closure decisions

Use [the manual account-deletion procedure](account-deletion-operations.md). Verify ownership without unnecessary identity documents. Resolve recurring billing, pending invoices, refunds and disputes first; keep the customer mapping and subscription state while the LIVE webhook or paid-through access still needs them. Revoke sessions and pending challenges promptly. Delete local information that is no longer needed, but preserve current-month quota state, the approved usage/approval retention windows and any specifically justified billing records. Do not insert or remove subscription state by hand. Tell the requester what was removed and identify any limited records retained and why. Processor-held data is handled separately through each provider.
