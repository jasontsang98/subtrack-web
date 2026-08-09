CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(12, 2) NOT NULL CHECK (price >= 0),
  cycle text NOT NULL CHECK (cycle IN ('weekly', 'fortnightly', 'monthly', 'yearly')),
  next_billing date NOT NULL,
  category text NOT NULL,
  color text NOT NULL DEFAULT '#208962',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS subscriptions_next_billing_idx
  ON subscriptions (next_billing);

CREATE TABLE IF NOT EXISTS email_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  recipient_email text,
  timezone text NOT NULL DEFAULT 'Australia/Sydney',
  send_hour smallint NOT NULL DEFAULT 8 CHECK (send_hour BETWEEN 0 AND 23),
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO email_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digest_key text NOT NULL UNIQUE,
  recipient_email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sending', 'sent', 'failed', 'skipped')),
  subscription_count integer NOT NULL DEFAULT 0,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO subscriptions (name, price, cycle, next_billing, category, color)
SELECT *
FROM (VALUES
  ('Netflix', 25.99, 'monthly', CURRENT_DATE + 3, 'Entertainment', '#e54747'),
  ('Figma', 24.00, 'monthly', CURRENT_DATE + 8, 'Software', '#8b6fe8'),
  ('Spotify', 13.99, 'monthly', CURRENT_DATE + 15, 'Entertainment', '#35a968'),
  ('iCloud+', 4.49, 'monthly', CURRENT_DATE + 22, 'Utilities', '#4d91d9'),
  ('Headspace', 99.99, 'yearly', CURRENT_DATE + 70, 'Health', '#ed824f')
) AS seed(name, price, cycle, next_billing, category, color)
WHERE NOT EXISTS (SELECT 1 FROM subscriptions);


CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  subscription_name text NOT NULL,
  category text NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  paid_on date NOT NULL,
  source text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscription_id, paid_on)
);

CREATE INDEX IF NOT EXISTS payment_history_paid_on_idx ON payment_history (paid_on DESC);

CREATE OR REPLACE FUNCTION roll_forward_subscriptions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item subscriptions%ROWTYPE;
  renewal_date date;
BEGIN
  FOR item IN SELECT * FROM subscriptions WHERE active AND next_billing < CURRENT_DATE
  LOOP
    renewal_date := item.next_billing;
    WHILE renewal_date < CURRENT_DATE
    LOOP
      INSERT INTO payment_history
        (subscription_id, subscription_name, category, amount, paid_on)
      VALUES
        (item.id, item.name, item.category, item.price, renewal_date)
      ON CONFLICT (subscription_id, paid_on) DO NOTHING;

      renewal_date := (
        renewal_date + CASE
          WHEN item.cycle = 'yearly' THEN INTERVAL '1 year'
          ELSE INTERVAL '1 month'
        END
      )::date;
    END LOOP;

    UPDATE subscriptions
    SET next_billing = renewal_date, updated_at = now()
    WHERE id = item.id;
  END LOOP;
END;
$$;
