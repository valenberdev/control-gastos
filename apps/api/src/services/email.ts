interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Control de Gastos <onboarding@resend.dev>";

  if (!apiKey) {
    console.error("RESEND_API_KEY no está configurada: no se envió el email.");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("Resend rechazó el email:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error al enviar el email:", err);
    return false;
  }
}

export function passwordResetEmail(link: string) {
  const subject = "Restablecé tu contraseña de Control de Gastos";

  const text = [
    "Recibimos un pedido para restablecer la contraseña de tu cuenta.",
    "",
    "Abrí este link para elegir una nueva. Vale por 1 hora y se puede usar una sola vez:",
    link,
    "",
    "Si no lo pediste vos, ignorá este mensaje: tu contraseña sigue siendo la misma.",
  ].join("\n");

  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#15161A">
  <h2 style="margin:0 0 12px">Restablecé tu contraseña</h2>
  <p>Recibimos un pedido para restablecer la contraseña de tu cuenta de Control de Gastos.</p>
  <p><a href="${link}" style="display:inline-block;background:#0A5FE0;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Elegir una contraseña nueva</a></p>
  <p style="font-size:13px;color:#565B6E">El link vale por 1 hora y se puede usar una sola vez. Si no lo pediste vos, ignorá este mensaje: tu contraseña sigue siendo la misma.</p>
  <p style="font-size:12px;color:#565B6E;word-break:break-all">Si el botón no funciona, copiá este link en el navegador:<br>${link}</p>
</div>`;

  return { subject, html, text };
}
