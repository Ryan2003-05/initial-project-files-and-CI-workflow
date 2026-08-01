export default `
ALTER TABLE sync_queue ADD COLUMN next_attempt INTEGER;
CREATE INDEX IF NOT EXISTS idx_sync_queue_next_attempt ON sync_queue(next_attempt);
`
