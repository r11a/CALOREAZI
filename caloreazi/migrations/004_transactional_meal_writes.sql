ALTER TABLE meals ADD COLUMN IF NOT EXISTS client_request_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS meals_user_client_request_idx
  ON meals(user_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

INSERT INTO schema_migrations(version) VALUES ('004_transactional_meal_writes') ON CONFLICT DO NOTHING;
