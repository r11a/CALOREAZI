CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  ha_user_id TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  onboarding_completed_at TIMESTAMPTZ,
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain', 'nutrition', 'fitness')),
  birth_date DATE,
  biological_sex TEXT CHECK (biological_sex IN ('female', 'male', 'unspecified')),
  height_cm NUMERIC(5,2),
  current_weight_kg NUMERIC(6,2),
  target_weight_kg NUMERIC(6,2),
  activity_level TEXT,
  daily_calorie_target INTEGER,
  daily_protein_target_g INTEGER,
  daily_water_target_ml INTEGER,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_provider_settings (
  provider TEXT PRIMARY KEY CHECK (provider IN ('openai', 'gemini')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  model TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL DEFAULT '',
  input_cost_per_million_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  output_cost_per_million_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  last_tested_at TIMESTAMPTZ,
  last_test_status TEXT CHECK (last_test_status IN ('success', 'error') OR last_test_status IS NULL),
  last_test_error TEXT,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  feature TEXT NOT NULL CHECK (feature IN ('coach', 'meal_vision', 'menu_scan', 'insight')),
  request_id TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost_usd NUMERIC(14,8) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_created_idx ON ai_usage_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_feature_created_idx ON ai_usage_log(feature, created_at DESC);

INSERT INTO ai_provider_settings(provider, model)
VALUES ('openai', ''), ('gemini', '')
ON CONFLICT(provider) DO NOTHING;

INSERT INTO app_settings(key, value)
VALUES ('ai', '{"activeProvider":"openai","monthlyBudgetUsd":10,"softLimitPercent":80,"hardLimitEnabled":true}'::jsonb)
ON CONFLICT(key) DO NOTHING;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
