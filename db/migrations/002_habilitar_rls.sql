-- Activa RLS en todas las tablas, sin políticas: deniega el acceso a cualquier
-- rol que no sea dueño de la tabla o no tenga BYPASSRLS. Importa en Supabase,
-- donde las tablas del esquema public quedan expuestas por la Data API
-- (PostgREST) a los roles anon y authenticated. La API se conecta con el rol
-- dueño (postgres), que no se ve afectado.
BEGIN;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Doble barrera: quita los privilegios de los roles públicos de Supabase (solo
-- si existen; en un Postgres común estos roles no están y el bloque no hace nada).
DO $$
DECLARE
  role_name text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', role_name);
    END IF;
  END LOOP;
END
$$;

COMMIT;
