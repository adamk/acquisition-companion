# Owner-approved paid-beta policy record

The Wired Nomad LLC operates Acquisition Companion and Acquisition Companion Deal Lab. This record captures the owner's operating decisions for the public U.S.-only paid beta. It does not claim attorney approval, completed legal review or legal advice.

## Offer and eligibility

- The paid beta is public to customers in the United States who are 18 or older.
- Deal Lab is one recurring product at $19 USD/month or $190 USD/year.
- Each plan includes up to 100 Deal Lab AI requests per UTC calendar month.
- The public course and source-linked education remain free without an account.
- Subscription payment supports interactive analysis, deterministic calculations, workflows, fictional practice, IC Challenge and associated model/compute usage.
- Customers sign in and affirm U.S.-customer eligibility at hosted Checkout. IP geolocation is not used as proof. Historical `paid_beta_checkout` records are not required for new Checkout and do not grant `ai_deal_lab`; only canonical eligible Stripe subscription state does.

## Billing decisions

- Billing recurs monthly or annually until the customer cancels in Manage billing.
- Cancellation stops renewal. Access continues through the already-paid period unless applicable law requires otherwise. Cancellation alone does not delete the account.
- Subscription fees are generally non-refundable after access has been used, except where required by applicable law. Billing errors go to support@acquisitioncompanion.com. Mandatory rights are preserved. No automatic outage credit or prorated-refund promise is made.
- Stripe hosts Checkout and billing management; Acquisition Companion does not collect or store card details.

## Privacy and data handling

- AWS SES delivers sign-in email; OpenAI processes Deal Lab requests; Cloudflare provides application, edge and database infrastructure; Stripe handles hosted billing. Optional Google Analytics remains separately consent-gated, and account pages suppress it.
- Application usage storage contains operational/accounting metadata, not prompts, responses or deal facts. OpenAI requests use `store: false`; this is not a provider zero-retention guarantee.
- The service does not sell personal information or use targeted advertising. Users are told not to submit confidential, proprietary, personal or non-public deal information. There is no confidential CIM/data-room upload feature.
- Account access, correction and deletion requests go to support@acquisitioncompanion.com where available under applicable law. No rights are waived by this policy.

## Retention decisions

- Sign-in challenges: 15 minutes, single-use; sessions: seven days unless signed out/revoked; sign-in attempt counters: approximately 24 hours; billing locks: 60-second operational leases.
- Completed detailed usage events: 90 days after completion. Monthly usage aggregates: 13 months total (current UTC month plus the preceding 12 months), with the current month protected and any aggregate preserved while its detailed events remain.
- Beta approvals: while active, then up to 12 months after revocation/account closure for beta operations/audit.
- Account/customer/subscription records: while needed to provide the service and reconcile billing; after closure, retain only information reasonably necessary for accounting, tax, billing disputes, fraud prevention, chargebacks or other applicable legal obligations. No universal statutory period is asserted.
- See the [data inventory and cleanup policy](paid-retention-review.md) and [account-deletion runbook](account-deletion-operations.md). Automatic usage cleanup is not enabled by this record; a separate operational setting is required.

## Market and later expansion

Paid access is not offered as a global launch. The U.S.-only scope remains the beta control. Any later UK, EU or other international expansion requires a separate owner decision covering tax/VAT/GST, consumer rules, privacy obligations and product eligibility. No change to Stripe Tax or payment configuration is made by this policy record.
