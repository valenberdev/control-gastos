import { useCallback, useEffect, useState } from "react";
import { del, get } from "../api/client";

interface LinkedChat {
  chatId: string;
  linkedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function TelegramLinks() {
  const [chats, setChats] = useState<LinkedChat[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    get<LinkedChat[]>("/auth/telegram")
      .then(setChats)
      .catch(() => setError("No se pudieron cargar los chats vinculados."));
  }, []);

  // Los chats se vinculan desde Telegram: se recarga al volver a esta pestaña.
  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  async function unlink(chatId: string) {
    if (
      !window.confirm(
        "¿Desvincular este chat de Telegram? Desde ahí ya no se van a poder cargar movimientos.",
      )
    )
      return;
    setError(null);
    try {
      await del(`/auth/telegram/${encodeURIComponent(chatId)}`);
      load();
    } catch {
      setError("No se pudo desvincular el chat. Probá de nuevo.");
    }
  }

  if (chats.length === 0 && !error) return null;

  return (
    <div className="stack-sm">
      {chats.length > 0 && <span className="mod-title">Chats vinculados</span>}
      {chats.map((chat) => (
        <div key={chat.chatId} className="linked-chat">
          <div className="stack-sm">
            <span className="linked-chat-name">
              Chat ····{chat.chatId.slice(-4)}
            </span>
            <span className="mod-meta">
              Vinculado el {dateFormatter.format(new Date(chat.linkedAt))}
            </span>
          </div>
          <button
            type="button"
            className="link-button is-danger"
            onClick={() => unlink(chat.chatId)}
          >
            Desvincular
          </button>
        </div>
      ))}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
