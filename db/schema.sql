CREATE TABLE IF NOT EXISTS clinic_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  clinic_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  avg_consultation_minutes INTEGER NOT NULL,
  max_tokens INTEGER NOT NULL,
  upi_id TEXT NOT NULL DEFAULT 'doctor@upi',
  token_price_rupees INTEGER NOT NULL DEFAULT 100
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

CREATE TABLE IF NOT EXISTS payment_requests (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  payment_date TEXT NOT NULL,
  patient_names_json TEXT NOT NULL,
  patient_phone TEXT NOT NULL,
  patient_count INTEGER NOT NULL,
  unit_price_rupees INTEGER NOT NULL,
  total_amount_rupees INTEGER NOT NULL,
  upi_id TEXT NOT NULL,
  status TEXT NOT NULL,
  utr TEXT,
  token_public_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  submitted_at TEXT,
  verified_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_utr_unique ON payment_requests(utr) WHERE utr IS NOT NULL;
