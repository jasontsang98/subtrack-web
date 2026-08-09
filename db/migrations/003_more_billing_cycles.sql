ALTER TABLE subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_cycle_check;

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_cycle_check
  CHECK (cycle IN ('weekly', 'fortnightly', 'monthly', 'yearly'));

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
        renewal_date + CASE item.cycle
          WHEN 'weekly' THEN INTERVAL '7 days'
          WHEN 'fortnightly' THEN INTERVAL '14 days'
          WHEN 'yearly' THEN INTERVAL '1 year'
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
