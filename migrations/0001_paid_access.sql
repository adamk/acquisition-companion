-- Dedicated PAID_DB only. Apply to an explicitly approved isolated database; this schema does not enable access.
PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL, stripe_customer_id TEXT UNIQUE);
CREATE TABLE auth_challenges (token_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, email TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE auth_attempts (email_hash TEXT NOT NULL, hour TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(email_hash,hour));
CREATE TABLE subscriptions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL, valid_until INTEGER NOT NULL, cancel_at_period_end INTEGER NOT NULL, observed_at INTEGER NOT NULL);
CREATE INDEX subscriptions_user ON subscriptions(user_id);
CREATE TABLE webhook_events (id TEXT PRIMARY KEY, processed_at INTEGER NOT NULL);
CREATE TABLE billing_locks (customer_id TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE usage_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), timestamp INTEGER NOT NULL, month TEXT NOT NULL, workflow TEXT NOT NULL, model TEXT NOT NULL, success INTEGER, latency_ms INTEGER, input_tokens INTEGER, cached_input_tokens INTEGER, output_tokens INTEGER, reasoning_tokens INTEGER, total_tokens INTEGER, estimated_cost REAL);
CREATE INDEX usage_user_month ON usage_events(user_id,month);
CREATE TABLE monthly_usage (user_id TEXT NOT NULL REFERENCES users(id), month TEXT NOT NULL, request_count INTEGER NOT NULL DEFAULT 0, estimated_cost REAL NOT NULL DEFAULT 0, unknown_cost_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id,month));
