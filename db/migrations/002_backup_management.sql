CREATE TABLE backup_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_key text NOT NULL UNIQUE,
  trigger text NOT NULL CHECK (trigger IN ('scheduled', 'manual')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  filename text,
  size_bytes bigint,
  error_message text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX backup_runs_requested_at_idx ON backup_runs (requested_at DESC);
