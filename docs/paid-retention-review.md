# Paid-access retention and deletion inventory — review required

No legal retention period is selected. Account deletion is an operator process requiring ownership verification, billing cancellation coordination and review of mandatory records. There is no new public deletion API. The following describes actual application storage; Stripe, SES, OpenAI, Cloudflare logs/backups and processor retention require separate review.

| Stored data | Fields / purpose | Active-account need | Current expiry / technical deletion | Unresolved policy |
|---|---|---|---|---|
| users | UUID, email, creation time, Stripe customer ID; identity/mapping | Yes | No automatic expiry; delete dependent rows before user, after billing coordination | Account closure, statutory billing references, backups |
| auth_challenges | Token/browser hashes, email, expiry; browser-bound sign-in | Only pending login | 15-minute validity; single-use DELETE; expiry cleanup | Delivery/log processor retention |
| sessions | Token hash, user UUID, CSRF hash, expiry | Only active sessions | Seven-day validity; logout DELETE; expiry cleanup | Whether closure revokes all sessions immediately (recommended) |
| auth_attempts | Email hash, UTC hour, count; resend abuse control | Temporary | Cleanup removes hour buckets older than one day | Abuse records and logs review |
| subscriptions | Stripe subscription ID, user UUID, canonical status, paid-through time, cancellation flag, observation time | Yes, plus billing disputes/reconciliation | No automatic expiry; dependent user rows can be deleted under reviewed policy | Mandatory records and canceled-account handling |
| webhook_events | Event ID, processing timestamp; idempotency | Needed for replay safety | No automatic expiry; individual SQL DELETE possible but unsafe without replay policy | Retention horizon and missed/replayed-event treatment |
| billing_locks | Customer ID, owner UUID, expiry; reconciliation serialization | Temporary | 60-second lease; release/expiry cleanup | No customer content; operational review |
| beta_checkout_approvals | User UUID, approval/revocation timestamps and operator labels; latest Checkout eligibility decision | While inviting/approving customers | Revocation disables only Checkout; manual DELETE on approved account closure | Approval audit retention; no identity documents stored |
| usage_events | Request UUID, user UUID, time/month, workflow/model, success, latency, input/cached/output/reasoning/total token counts, estimated cost | Current quota/accounting; older analytics optional | Optional approved TTL deletes completed old rows only; unfinished rows preserved | Approve a duration and treatment of unresolved accounting |
| monthly_usage | User UUID, UTC month, request count, estimated cost, unknown-cost count | Current-month quota; historical accounting optional | Optional approved TTL protects current month and months with unfinished requests | Approve historical aggregate duration |

Entitlement is computed from subscription state, not stored in a separate entitlement table. No prompts, responses, deal facts, chat history, identity documents or card data enter these tables.

## Configurable usage cleanup — disabled by default

`PAID_RETENTION_POLICY_APPROVED=true` plus explicitly reviewed positive integral `PAID_USAGE_RETENTION_DAYS` and/or `PAID_MONTHLY_USAGE_RETENTION_MONTHS` are required. No period defaults are chosen. With approval false/unset, cleanup deletes no usage data. Current-month usage/quota and unfinished requests cannot be erased by these settings. Expired-auth cleanup remains separate. Invalid approved settings fail instead of silently deleting data.

Master paywall false makes the production scheduled handler inert. No retention configuration or production purge has been applied. Migration 0002 approval verification used and removed synthetic records only. Account, subscription, approval and webhook records are deliberately excluded from automatic usage cleanup.

## Account-deletion procedure to finalize

Verify ownership without collecting additional sensitive documents. Coordinate renewal cancellation, pending refunds/disputes and legally required records. Revoke sessions and pending challenges; delete permitted usage/monthly aggregates, approval and subscription references before deleting users, in a reviewed transaction. Email-keyed challenge/throttle records and external Stripe/processor records need separate handling. Do not delete a customer mapping while recurring billing can continue. Recordkeeping exceptions, backups, timeframes and customer notification need legal/operations approval before launch.
