# Invite-only paid-beta activation runbook

**Prepared only. Do not run these steps without a separate explicit production-activation approval.** This runbook assumes the reviewed release has already been deployed and verified with all activation flags off.

## Preserve existing production state

- Keep the public course and source-linked education free and globally accessible.
- Preserve legitimate LIVE customer, subscription, payment, entitlement and usage records through their canonical paid-through dates.
- Keep the Acquisition Companion LIVE Stripe webhook enabled so canonical billing changes continue to reconcile through that paid period and afterward.
- Do not change Stripe products, prices, tax settings, customer data, or subscription state during flag activation.
- Do not change `OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`, model settings, the corpus, or the three AI rate-limit bindings.

## Pre-activation checks

From a clean checkout of the exact release commit that is already deployed:

1. Confirm `wrangler whoami` is the intended Cloudflare account and the release commit matches the deployed source.
2. Confirm main Worker activation variables are all `false`: `AI_INTERACTIVE_ENABLED`, `AI_PAYWALL_ENABLED`, `AUTH_SIGNIN_ENABLED`, and `BILLING_ENABLED`.
3. Confirm the private mailer has `AUTH_MAIL_ENABLED=false`, both secret binding names are present, and it has no public route or workers.dev/preview URL.
4. Confirm the LIVE webhook remains enabled with the reviewed URL, API version and five events.
5. Confirm the paid D1 database is healthy, the operator remains entitled through the paid-through date, and no unrelated account will be approved.
6. Confirm Cloudflare production Worker errors/logs, Stripe webhook delivery history and AWS SES send/bounce status are visible to the operator.
7. Confirm legal, privacy, tax, retention and support policies have received the required final review.

## Activate

Use Node.js 22.19 or later and the already-authenticated production Wrangler account. These commands create new Worker versions from the same reviewed source checkout; they do not rotate secrets or alter Stripe resources. `--keep-vars` preserves existing dashboard variables and Worker secrets.

First enable only the private mailer:

```sh
npx wrangler deploy --config wrangler.mailer-production.example.json --var AUTH_MAIL_ENABLED:true --keep-vars
```

Verify the private mailer is enabled, remains private, and has no public route before continuing. Then enable the main Worker gates together:

```sh
npx wrangler deploy --config wrangler.jsonc --var AI_INTERACTIVE_ENABLED:true --var AI_PAYWALL_ENABLED:true --var AUTH_SIGNIN_ENABLED:true --var BILLING_ENABLED:true --keep-vars
```

Do not set `AUTH_MAIL_ENABLED=true` on the main Worker; sending remains behind the private service binding. `BILLING_TEST_MODE=false`, the production price/Portal variables, production D1, and existing server-only OpenAI bindings must remain unchanged.

## Verify immediately

1. Verify the active main Worker version and effective values: `AI_INTERACTIVE_ENABLED=true`, `AI_PAYWALL_ENABLED=true`, `AUTH_SIGNIN_ENABLED=true`, `BILLING_ENABLED=true`, and main `AUTH_MAIL_ENABLED=false`. Verify private mailer `AUTH_MAIL_ENABLED=true`.
2. Verify `/api/billing/status` reports sign-in and billing available and the paywall enabled; `/api/ai/status` reports `access_required` for a signed-out browser while AI configuration itself remains ready.
3. Verify a signed-out direct `/api/ai` POST is denied before OpenAI, and the public `/course/` remains readable without an account.
4. Verify any existing subscription remains active through its canonical paid-through date and its usage count remains intact. Do not create another Checkout or alter cancellation.
5. Check that an unapproved signed-in account cannot create Checkout; an approved account can reach hosted Checkout only after U.S.-customer attestation; beta approval alone never grants AI access.
6. Verify an entitled request is counted once, the 100-request monthly limit blocks the next request before OpenAI, and no prompt/response content is stored.
7. Confirm the LIVE webhook still processes normally. Review Worker errors, webhook deliveries and SES send/bounce indicators during the first invitations.

## Roll back a launch issue

If paid AI access is misapplied or unhealthy, disable entitlement enforcement first to restore the existing open AI behavior, then disable new billing and sign-in. Stop new auth mail last. Keep the LIVE Stripe webhook enabled while any real subscription has lifecycle state to reconcile.

```sh
npx wrangler deploy --config wrangler.jsonc --var AI_INTERACTIVE_ENABLED:false --var AI_PAYWALL_ENABLED:false --var AUTH_SIGNIN_ENABLED:false --var BILLING_ENABLED:false --keep-vars
npx wrangler deploy --config wrangler.mailer-production.example.json --var AUTH_MAIL_ENABLED:false --keep-vars
```

After rollback, verify `/ai/` remains readable, interactive requests are blocked, auth and billing endpoints fail closed, the mailer is disabled, and all existing customer/subscription/entitlement records remain intact. Never compensate for a webhook failure by inserting subscription or entitlement state manually; follow [the billing reconciliation procedure](paid-beta-launch-operations.md) and stop/escalate if no legitimate signed event can be replayed.
