-- Retention for detailed usage is measured from completion, never reservation.
ALTER TABLE usage_events ADD COLUMN completed_at INTEGER;

-- Existing completed rows predate this field. Start a conservative 90-day
-- window from migration time (or a later recorded request timestamp).
UPDATE usage_events SET completed_at = MAX(timestamp, CAST(strftime('%s', 'now') AS INTEGER) * 1000) WHERE success IS NOT NULL;
