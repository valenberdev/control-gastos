
set -euo pipefail
cd "$(dirname "$0")/.."

read -rsp "Cadena de conexión (Session pooler): " CONN
echo

psql_remote() {
  docker compose exec -T -e CONN="$CONN" db sh -c 'psql "$CONN" -v ON_ERROR_STOP=1 -At'
}

if ! applied="$(psql_remote <<< "SELECT version FROM schema_migrations ORDER BY version")"; then
  echo "No se pudo leer schema_migrations. Si es la primera vez, aplicá a mano la migración 005 (ver docs/deployment.md)." >&2
  exit 1
fi

pending=()
for file in db/migrations/*.sql; do
  version="$(basename "$file" | cut -c1-3)"
  grep -qx "$version" <<< "$applied" || pending+=("$file")
done

if [ "${#pending[@]}" -eq 0 ]; then
  echo "La base está al día."
  exit 0
fi

echo "Migraciones pendientes:"
printf '  %s\n' "${pending[@]}"
read -rp "¿Aplicarlas en orden? [s/N] " answer
[ "$answer" = "s" ] || { echo "Cancelado."; exit 1; }

for file in "${pending[@]}"; do
  echo "== $file"
  docker compose exec -T -e CONN="$CONN" db sh -c 'psql "$CONN" -v ON_ERROR_STOP=1' < "$file"
  version="$(basename "$file" | cut -c1-3)"
  name="$(basename "$file" .sql)"
  psql_remote <<< "INSERT INTO schema_migrations (version, name) VALUES ('$version', '$name') ON CONFLICT DO NOTHING"
done
echo "Listo."