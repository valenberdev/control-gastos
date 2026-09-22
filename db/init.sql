CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  monthly_budget NUMERIC(12,2)
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES categories(id),
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('web', 'telegram')),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_category_date ON expenses (category_id, expense_date);

CREATE TABLE recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL REFERENCES categories(id),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly')),
  next_run_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO categories (name, icon) VALUES
  ('comida', 'utensils'),
  ('transporte', 'car'),
  ('entretenimiento', 'movie'),
  ('salud', 'heart'),
  ('servicios', 'bolt'),
  ('otros', 'dots');

  CREATE TABLE incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('web', 'telegram')),
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);