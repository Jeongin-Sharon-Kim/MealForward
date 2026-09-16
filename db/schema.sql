CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  biz_no TEXT,
  fiscal_year_end_month INTEGER DEFAULT 9
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  employee_no TEXT,
  name TEXT NOT NULL,
  department TEXT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  year_month TEXT NOT NULL,
  remaining_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_rolled_over BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS point_ledgers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  point_type TEXT NOT NULL CHECK (point_type IN ('GENERAL', 'FLEXI_MEAL')),
  amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_name TEXT NOT NULL,
  mcc_code TEXT,
  general_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  flexi_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_amount DOUBLE PRECISION NOT NULL,
  approval_status TEXT NOT NULL,
  redemption_status TEXT NOT NULL DEFAULT 'UNUSED' CHECK (redemption_status IN ('UNUSED','USED','REFUNDED')),
  voucher_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardrail_logs (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER NOT NULL REFERENCES payment_transactions(id),
  risk_score DOUBLE PRECISION,
  is_blocked BOOLEAN NOT NULL,
  block_reason TEXT,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DOUBLE PRECISION NOT NULL,
  is_cash_like BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE IF NOT EXISTS guardrail_policy (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  block_gift_cards BOOLEAN NOT NULL DEFAULT TRUE,
  block_cash_equivalents BOOLEAN NOT NULL DEFAULT TRUE,
  risk_threshold DOUBLE PRECISION NOT NULL DEFAULT 0.7
);
