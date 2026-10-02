set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."

read -rsp "Cadena de conexión (Session pooler): " CONN
echo

COUNTS_SQL="SELECT format('%s=%s', t, n) FROM (
  SELECT 'users' AS t, count(*) AS n FROM users
  UNION ALL SELECT 'expenses', count(*) FROM expenses
  UNION ALL SELECT 'incomes', count(*) FROM incomes
  UNION ALL SELECT 'categories', count(*) FROM categories
  UNION ALL SELECT 'recurring_expenses', count(*) FROM recurring_expenses
  UNION ALL SELECT 'telegram_links', count(*) FROM telegram_links
  UNION ALL SELECT 'push_subscriptions', count(*) FROM push_subscriptions
  UNION ALL SELECT 'schema_migrations', count(*) FROM schema_migrations
) c ORDER BY t"

version_num="$(docker run --rm -e CONN="$CONN" postgres:16-alpine sh -c 'psql "$CONN" -v ON_ERROR_STOP=1 -At -c "SHOW server_version_num"')"
major="${version_num:0:2}"
image="postgres:${major}-alpine"
echo "Servidor PostgreSQL ${major}: se usa la imagen ${image}."

mkdir -p backups
file="backups/control-gastos-$(date +%Y%m%d-%H%M%S).sql.gz"

echo "Respaldando..."
docker run --rm -e CONN="$CONN" "$image" \
  sh -c 'pg_dump "$CONN" --format=plain --no-owner --no-privileges --schema=public' | gzip > "$file"
[ -s "$file" ] || { echo "El respaldo quedó vacío." >&2; rm -f "$file"; exit 1; }

remote_counts="$(docker run --rm -i -e CONN="$CONN" "$image" sh -c 'psql "$CONN" -v ON_ERROR_STOP=1 -At' <<< "$COUNTS_SQL")"

echo "Verificando que se puede restaurar..."
scratch="restore-check-$$"
docker run -d --rm --name "$scratch" -e POSTGRES_PASSWORD=scratch "$image" > /dev/null
trap 'docker rm -f "$scratch" > /dev/null 2>&1 || true' EXIT

for _ in $(seq 1 60); do
  ready="$(docker logs "$scratch" 2>&1 | grep -c 'database system is ready to accept connections' || true)"
  [ "$ready" -ge 2 ] && break
  sleep 1
done
[ "$ready" -ge 2 ] || { echo "El Postgres descartable no arrancó." >&2; exit 1; }

gunzip -c "$file" | docker exec -i "$scratch" psql -U postgres -d postgres -v ON_ERROR_STOP=1 -q > /dev/null
restored_counts="$(docker exec -i "$scratch" psql -U postgres -d postgres -At <<< "$COUNTS_SQL")"

if [ "$remote_counts" = "$restored_counts" ]; then
  echo "Respaldo verificado: $file ($(du -h "$file" | cut -f1))"
  echo "$restored_counts"
else
  echo "Las cantidades de filas no coinciden (si alguien usó la app durante el respaldo, repetilo):" >&2
  diff <(echo "$remote_counts") <(echo "$restored_counts") >&2 || true
  exit 1
fi

find backups -name 'control-gastos-*.sql.gz' -mtime +90 -delete