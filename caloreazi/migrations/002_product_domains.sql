-- CALOREAZI normalized product domains. Every personal row carries user_id.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email)) WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessions_user_active_idx ON sessions(user_id, expires_at DESC) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS daily_records (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
  water_ml INTEGER NOT NULL DEFAULT 0 CHECK (water_ml >= 0),
  daily_score INTEGER CHECK (daily_score BETWEEN 0 AND 100),
  ai_insight TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, local_date)
);

CREATE TABLE IF NOT EXISTS media_objects (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('meal','menu','inventory','avatar','voice','document','export')),
  destination TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  sha256 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(destination, relative_path, file_name)
);
CREATE INDEX IF NOT EXISTS media_user_kind_idx ON media_objects(user_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_record_id BIGINT REFERENCES daily_records(id) ON DELETE SET NULL,
  media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('breakfast','lunch','dinner','snack')),
  source TEXT NOT NULL CHECK (source IN ('manual','photo','voice','favorite','previous')),
  occurred_at TIMESTAMPTZ NOT NULL,
  kcal NUMERIC(10,2) NOT NULL CHECK (kcal >= 0),
  protein_g NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0),
  carbs_g NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (carbs_g >= 0),
  fat_g NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0),
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  transcript TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meals_user_time_idx ON meals(user_id, occurred_at DESC) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS nutrition_foods (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version TEXT,
  name_he TEXT NOT NULL,
  name_en TEXT,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  kcal_per_100g NUMERIC(10,3) NOT NULL CHECK (kcal_per_100g >= 0),
  protein_per_100g NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (protein_per_100g >= 0),
  carbs_per_100g NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (carbs_per_100g >= 0),
  fat_per_100g NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (fat_per_100g >= 0),
  verified_at TIMESTAMPTZ,
  UNIQUE(source, source_id)
);

CREATE TABLE IF NOT EXISTS meal_items (
  id BIGSERIAL PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  nutrition_food_id BIGINT REFERENCES nutrition_foods(id) ON DELETE SET NULL,
  detected_name TEXT NOT NULL,
  confirmed_name TEXT,
  grams NUMERIC(10,2) NOT NULL CHECK (grams > 0),
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit TEXT NOT NULL DEFAULT 'portion',
  confidence NUMERIC(4,3) CHECK (confidence BETWEEN 0 AND 1),
  nutrition_source TEXT,
  kcal_per_100g NUMERIC(10,3),
  protein_per_100g NUMERIC(10,3),
  carbs_per_100g NUMERIC(10,3),
  fat_per_100g NUMERIC(10,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS measurements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  weight_kg NUMERIC(6,2) NOT NULL CHECK (weight_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS measurements_user_time_idx ON measurements(user_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL,
  activity_type TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0 CHECK (minutes >= 0),
  steps INTEGER NOT NULL DEFAULT 0 CHECK (steps >= 0),
  distance_km NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  floors INTEGER NOT NULL DEFAULT 0 CHECK (floors >= 0),
  active_calories INTEGER NOT NULL DEFAULT 0 CHECK (active_calories >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id UUID REFERENCES media_objects(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('meal_photo','meal_text','meal_voice','menu','inventory')),
  status TEXT NOT NULL CHECK (status IN ('pending','processing','needs_confirmation','completed','failed','cancelled')),
  provider TEXT,
  model TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  confidence TEXT CHECK (confidence IN ('low','medium','high') OR confidence IS NULL),
  result JSONB,
  error_code TEXT,
  error_message TEXT,
  next_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, client_id)
);
CREATE INDEX IF NOT EXISTS analysis_jobs_pending_idx ON analysis_jobs(status, next_attempt_at, created_at);

CREATE TABLE IF NOT EXISTS food_calibrations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  detected_name TEXT,
  confirmed_name TEXT NOT NULL,
  previous_grams NUMERIC(10,2),
  confirmed_grams NUMERIC(10,2) NOT NULL,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS partnerships (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  invite_email TEXT NOT NULL,
  invite_token_hash TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (owner_id IS DISTINCT FROM partner_id)
);

CREATE TABLE IF NOT EXISTS trash_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  purge_after TIMESTAMPTZ NOT NULL,
  permanently_deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS trash_user_active_idx ON trash_items(user_id, deleted_at DESC) WHERE permanently_deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database','configuration','full','safety')),
  file_name TEXT NOT NULL UNIQUE,
  destination TEXT NOT NULL,
  byte_size BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  manifest JSONB NOT NULL,
  verified_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backup_schedules (
  id BIGSERIAL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database','configuration','full')),
  local_time TIME NOT NULL DEFAULT '03:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jerusalem',
  retention_count INTEGER NOT NULL DEFAULT 14 CHECK (retention_count > 0),
  destination TEXT NOT NULL DEFAULT 'internal',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ
);

INSERT INTO schema_migrations(version) VALUES ('002_product_domains') ON CONFLICT DO NOTHING;
