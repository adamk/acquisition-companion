# Invite-only paid-beta operator checklist

This checklist supports the first 5–10 manually approved U.S. customers. The paid beta is live and invite-only. The course and source-linked educational material remain free; the subscription supports interactive analysis, deterministic calculations, deal workflows, fictional practice, IC Challenge and associated model/compute use. Acquisition Companion is independent and is not affiliated with or endorsed by referenced creators.

The offer is **$19/month or $190/year**, with up to **100 Deal Lab AI requests per UTC calendar month**. Customers must be 18 or older, be approved for beta Checkout, and attest that they are U.S. customers. Do not use IP geolocation as proof of eligibility or request identity documents. Do not invite customers to submit confidential or non-public deal information. Support: [support@acquisitioncompanion.com](mailto:support@acquisitioncompanion.com).

Terms and Privacy state the owner-approved live-beta policy. They are not represented as attorney-approved or as legal advice. The public pages and this checklist should stay consistent with the [owner policy record](paid-beta-owner-policy.md) and [retention policy](paid-retention-review.md).

## Before each invitation

- Confirm `/course/`, `/account/`, `/pricing/`, `/ai/`, `/terms/` and `/privacy/` load and the free course is readable without an account.
- Confirm the operator can view Cloudflare Worker errors/logs, Stripe LIVE webhook delivery history, and AWS SES send/bounce status. Pause invitations if these are unavailable.
- Confirm the existing LIVE webhook is enabled and its reviewed lifecycle events are processing. Do not change its configuration to invite a customer.
- Confirm the approved support address is monitored. The SES mailer sends sign-in email; it is not an invitation or marketing-mail system.
- Confirm the current prices, U.S.-only availability and 100-request allowance match `/pricing/` and Checkout. Do not promise “unlimited” use, financing, lender approval or a successful acquisition.

## Approve and invite one customer

1. **Confirm eligibility.** Use the support channel. The customer must be 18 or older, request access, have or create their own account, and explicitly confirm U.S.-customer eligibility. Do not collect passports, tax identifiers, payment details or deal documents.
2. **Verify sign-in.** Ask the customer to request a link from their normal browser and open it in that same browser. Confirm `/account/` shows their signed-in account. Do not request or retain the link, token, cookie or session value.
3. **Approve Checkout only.** Follow [the production approval procedure](paid-beta-approval.md). Approve only the existing authenticated account for `paid_beta_checkout`, recording the approval timestamp and a short operator label. Read back the decision and confirm it did not create a customer, subscription or `ai_deal_lab` entitlement.
4. **Send the invitation.** Use an operator-approved one-to-one channel. Include `/account/` and `/pricing/`, U.S.-only and 18+ eligibility, both prices, the 100-request monthly allowance, the free-course boundary, and support email. Never include a sign-in token or ask the customer to send one to support.
5. **Confirm Checkout eligibility.** Have the customer reload their account or pricing page. They must complete the server-protected hosted Checkout flow and its explicit U.S.-customer attestation. Beta approval alone does not unlock AI.

## After Checkout

- A success-page redirect is not proof of payment. In Stripe LIVE, verify the Acquisition Companion product and chosen Price, one mapped customer, one canonical subscription and a paid initial invoice. Do not use account-wide counts from the shared Stripe account.
- In Stripe Workbench, verify the signed webhook delivery received HTTP success. In D1/account state, verify the canonical subscription and `ai_deal_lab` entitlement. Only verified Stripe subscription state grants that entitlement; never insert it manually.
- Confirm `/account/` shows active access, Manage billing, usage, remaining requests and UTC reset. Usage begins at zero; model-reaching requests count under the published policy. Do not reset a counter to resolve a discrepancy.
- If cancellation is scheduled at period end, verify `cancel_at_period_end` and the paid-through date in Stripe and the account page. Access continues through the already-paid period and ends when canonical subscription state is no longer eligible.
- Ask for feedback with the [beta feedback template](paid-beta-feedback-template.md). Ask for high-level descriptions; do not request prompts, responses, company identities or confidential deal details.

## Daily checks while beta customers are active

- Review Stripe webhook failures/pending attempts and the associated safe application failure stage.
- Review Cloudflare Worker errors and privacy-safe billing/auth diagnostics.
- Review AWS SES send/reject/bounce or complaint indicators for sign-in delivery.
- Check `/api/ai/status`, customer-reported AI failures and aggregate quota outcomes. A 429 may mean the monthly allowance is exhausted; verify the UTC account counter before explaining it. Do not reset quota or make extra real model requests while diagnosing.
- Do not inspect or log prompts, responses or private deal facts as part of routine operations.

## Customer paid but access is missing; webhook recovery

1. Start read-only. In Stripe LIVE, verify the account, exact Acquisition Companion product/Price, Customer ID, Subscription ID, subscription status/current period/cancellation flag, relevant Checkout `client_reference_id`, customer `ac_user_id`, event ID/type and delivery history. In D1, verify the exact account-to-customer mapping, subscription row, event marker and any customer lock. Never copy payment-card data.
2. A successful customer lookup with no Acquisition Companion mapping means the shared-account event is unrelated and should be acknowledged without a write. Do not create a mapping for an unrelated customer.
3. If the correct D1 account is proven from both Stripe metadata and Checkout and its `stripe_customer_id` is `NULL`, a narrowly conditional NULL-to-customer correction may be used under the private [production reconciliation procedure](paid-beta-approval.md#production-webhook-reconciliation). Never replace a non-NULL mapping by guess.
4. Choose the latest legitimate signed Stripe event for that subscription (`customer.subscription.created`, `.updated` or `.deleted`; `invoice.paid` or `invoice.payment_failed` also causes canonical lookup). If no event marker exists, use Stripe Workbench's normal resend after confirming the endpoint is enabled. If the marker exists but the D1 subscription is missing or stale, follow the exact marker recovery procedure below; never clear a healthy marker.
5. Verify a successful HTTP response, exactly one event marker, the canonical subscription row and account entitlement afterward. The webhook retrieves canonical Stripe state; never fabricate a subscription row or entitlement.
6. If no legitimate resendable event exists, identifiers conflict, D1 is unavailable, duplicates appear, or the canonical state remains inconsistent, **stop and escalate**. Do not hand-edit subscription or entitlement state.

The detailed SELECT checks, conditional NULL-mapping correction, exact-event marker recovery, rollback and case matrix are maintained in [paid-beta-approval.md](paid-beta-approval.md#production-webhook-reconciliation). The recovery path uses the existing signed webhook; there is no public admin endpoint.

## Other support incidents

- **Failed payment / past due:** verify canonical subscription and latest invoice status. Direct the customer to Manage billing or support. Do not promise continued access beyond verified eligibility or issue a refund without an authorized decision.
- **Cancellation:** verify that renewal stopped and record the paid-through date. Keep the LIVE webhook enabled until lifecycle updates are no longer needed. Do not cancel immediately or remove access manually.
- **Refund or dispute/chargeback:** verify the Stripe record, preserve necessary billing evidence, respond through Stripe's normal operations and document the outcome. Do not promise a refund or credit beyond the published policy and mandatory rights.
- **Sign-in or SES problem:** inspect the safe diagnostic stage and SES send/bounce status. Do not ask the customer to forward a token or full link; diagnose before requesting a fresh link.
- **OpenAI outage or service failure:** check provider and Worker status plus safe error metadata. Tell the customer the service is unavailable; do not ask them to paste confidential deal information into support.
- **Account deletion request:** follow [the manual account-deletion procedure](account-deletion-operations.md). Verify ownership and resolve billing first; do not improvise D1 edits.

## Stop and escalate

Stop if an account/customer mapping is non-NULL but conflicts, the customer or subscription cannot be matched, D1 is unavailable, duplicate customer/subscription/entitlement rows appear, the LIVE webhook has no legitimate event to resend, or a write would require guessing. Never create fake subscription state, clear a healthy idempotency marker, bypass approval/attestation, or delete the operator's paid account data as part of routine support. See the [production deployment and rollback runbook](paid-beta-activation-runbook.md) for feature-gate safety. Keep the LIVE webhook enabled while any subscription still needs lifecycle events.
