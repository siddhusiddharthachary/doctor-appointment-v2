-- Reference schema. The application also creates these tables automatically.
CREATE TABLE IF NOT EXISTS clinic_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  clinic_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  avg_consultation_minutes INTEGER NOT NULL,
  max_tokens INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS queue_days (
  queue_date TEXT PRIMARY KEY,
  booking_open BOOLEAN NOT NULL DEFAULT TRUE,
  paused BOOLEAN NOT NULL DEFAULT FALSE,
  next_token_number INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS tokens (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  patient_name TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  token_date TEXT NOT NULL,
  token_number INTEGER NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  called_at TEXT,
  completed_at TEXT,
  UNIQUE(token_date, token_number)
);
