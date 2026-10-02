interface ConnectionNoticeProps {
  // true si todavía no llegó ningún dato: casi seguro el servidor gratuito está despertando.
  waking: boolean;
  onRetry: () => void;
}

export default function ConnectionNotice({
  waking,
  onRetry,
}: ConnectionNoticeProps) {
  return (
    <div className="connection-notice" role="status">
      <p>
        {waking
          ? "Despertando el servidor… la primera vez puede tardar hasta un minuto."
          : "Sin conexión con el servidor. Reintentando…"}
      </p>
      <button type="button" onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
