
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.password_resets') IS NULL THEN
    RAISE EXCEPTION 'Falta la migración 001 (tabla password_resets)';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass) THEN
    RAISE EXCEPTION 'Falta la migración 002 (RLS en users)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'token_version'
  ) THEN
    RAISE EXCEPTION 'Falta la migración 003 (columna users.token_version)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM push_subscriptions
    WHERE length(endpoint) > 2048
       OR endpoint !~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  ) THEN
    RAISE EXCEPTION 'Falta la migración 004 (hay suscripciones push de hosts no permitidos)';
  END IF;
END
$$;

CREATE TABLE schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON schema_migrations FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;

INSERT INTO schema_migrations (version, name) VALUES
  ('001', 'anterior al registro'),
  ('002', 'anterior al registro'),
  ('003', 'anterior al registro'),
  ('004', 'anterior al registro'),
  ('005', '005_registro_de_migraciones');

COMMIT;