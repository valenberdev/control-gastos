import { Link } from "react-router";
import LegalPage from "../components/LegalPage";

const LINKEDIN_URL = "https://www.linkedin.com/in/valenberdini/";
const AAIP_URL = "https://www.argentina.gob.ar/aaip";

export default function Privacy() {
  return (
    <LegalPage title="Política de privacidad" updated="1 de octubre de 2026">
      <p>
        Esta política explica qué datos guarda Control de Gastos, para qué los
        usa y cómo podés controlarlos.
      </p>

      <h2>1. Quién es el responsable</h2>
      <p>
        Control de Gastos es un proyecto personal y sin fines de lucro de
        Valentino Berdini, de Argentina, que es el responsable del tratamiento
        de los datos descritos acá. Para cualquier consulta podés escribirle por{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        .
      </p>

      <h2>2. Qué datos se guardan y para qué</h2>
      <ul>
        <li>
          <strong>Cuenta:</strong> tu email (para identificarte, iniciar sesión
          y enviarte el mail de recuperación), tu contraseña (solo se guarda un
          hash: nadie puede leerla ni recuperarla) y tu zona horaria (para
          decidir qué día es «hoy» al cargar un movimiento).
        </li>
        <li>
          <strong>Movimientos:</strong> el monto, la categoría (en los gastos),
          la descripción opcional, la fecha y el origen (web o Telegram) de cada
          gasto o ingreso, para mostrarte el saldo, los gráficos y el historial.
        </li>
        <li>
          <strong>Telegram (solo si lo vinculás):</strong> el número de
          identificación de tu chat, para saber a qué cuenta corresponden tus
          mensajes. El bot procesa lo que le escribís para registrar el
          movimiento y no guarda un historial de la conversación.
        </li>
        <li>
          <strong>Notificaciones (solo si las activás):</strong> los datos
          técnicos de la suscripción que genera tu navegador, necesarios para
          enviarte los avisos.
        </li>
        <li>
          <strong>Datos temporales:</strong> los códigos para vincular Telegram
          y los tokens de recuperación de contraseña (de estos solo se guarda un
          hash). Vencen a los 10 minutos y a la hora, respectivamente. Se
          eliminan al usarse, y los vencidos que nadie usó se limpian la próxima
          vez que se genera uno nuevo.
        </li>
        <li>
          <strong>Datos técnicos:</strong> tu dirección IP se usa en memoria
          para limitar intentos abusivos y no se guarda en la base de datos. Los
          proveedores de alojamiento pueden registrarla según sus propias
          políticas.
        </li>
      </ul>
      <p>
        No se piden nombre, teléfono, DNI, ubicación ni datos bancarios, y la
        app no se conecta a cuentas bancarias. La descripción de un movimiento
        es texto libre: no escribas ahí datos sensibles tuyos ni de otras
        personas.
      </p>

      <h2>3. Qué no se hace</h2>
      <ul>
        <li>No se venden ni se ceden tus datos.</li>
        <li>No hay publicidad ni herramientas de analítica.</li>
        <li>No se arman perfiles ni se toman decisiones automatizadas.</li>
        <li>
          La tipografía se sirve desde el propio dominio de la app, sin pedidos
          a terceros.
        </li>
      </ul>

      <h2>4. Cookies y almacenamiento local</h2>
      <p>
        La app no usa cookies. Guarda en el almacenamiento local de tu navegador
        la sesión iniciada y tu preferencia de tema, y un service worker guarda
        en caché los archivos de la aplicación para poder instalarla. Cerrar
        sesión borra la sesión guardada.
      </p>

      <h2>5. Proveedores que intervienen</h2>
      <p>
        Para funcionar, la app usa servicios de terceros, cada uno con sus
        propios términos y políticas:
      </p>
      <ul>
        <li>
          <strong>Supabase:</strong> base de datos, en servidores de São Paulo
          (Brasil).
        </li>
        <li>
          <strong>Render:</strong> servidor de la API y del bot, en Estados
          Unidos (Virginia).
        </li>
        <li>
          <strong>Vercel:</strong> alojamiento de la web, en una red global de
          servidores.
        </li>
        <li>
          <strong>Resend:</strong> envío del mail de recuperación de contraseña
          (recibe tu email y el link). Es una empresa de Estados Unidos.
        </li>
        <li>
          <strong>Telegram:</strong> solo si usás el bot. Telegram trata los
          mensajes que le enviás según su propia política.
        </li>
        <li>
          <strong>Servicios de notificaciones de tu navegador</strong> (Google,
          Apple o Mozilla): transportan los avisos push, que viajan cifrados.
        </li>
      </ul>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Tus datos se almacenan y procesan fuera de Argentina (Brasil y Estados
        Unidos). Al usar la app aceptás esa ubicación.
      </p>

      <h2>7. Cuánto tiempo se conservan y cómo se eliminan</h2>
      <p>
        Los datos se conservan mientras tu cuenta exista. Desde{" "}
        <Link to="/perfil">Perfil</Link> podés eliminarla: se borran de la base
        de datos tu cuenta y todo lo asociado (movimientos, vínculo de Telegram,
        suscripciones a notificaciones y códigos pendientes). Los proveedores
        pueden conservar copias técnicas y registros por un período limitado,
        según sus propias políticas.
      </p>

      <p>
        Además se hacen copias de respaldo periódicas de la base de datos, que
        se guardan de forma local y se usan solo para recuperar el servicio si
        se pierden datos. Una cuenta eliminada puede seguir figurando en copias
        anteriores hasta que se descartan, a los 90 días como máximo.
      </p>

      <h2>8. Seguridad</h2>
      <p>
        Las contraseñas se guardan con hash, las conexiones usan HTTPS, hay
        límites de intentos contra el abuso y solo se accede a tus datos con tu
        sesión. Al restablecer tu contraseña se cierran las sesiones abiertas y
        se desvinculan los chats de Telegram y los dispositivos con
        notificaciones. Ningún sistema es completamente seguro y esto es un
        proyecto personal que no pasó por una auditoría externa.
      </p>

      <h2>9. Tus derechos y cómo ejercerlos</h2>
      <p>
        Desde la app podés ver, editar y borrar tus movimientos, cambiar tu zona
        horaria y eliminar tu cuenta. Para pedir acceso o rectificación de tus
        datos, o para cualquier otra consulta, escribí por{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        . Voy a responder dentro de los plazos que fija la ley: 10 días corridos
        para los pedidos de acceso y 5 días hábiles para los de rectificación o
        supresión.
      </p>
      <p>
        Como titular de los datos, podés ejercer el derecho de acceso de forma
        gratuita a intervalos no inferiores a seis meses, salvo que acredites un
        interés legítimo (artículo 14, inciso 3, de la Ley 25.326). La Agencia
        de Acceso a la Información Pública (
        <a href={AAIP_URL} target="_blank" rel="noopener noreferrer">
          AAIP
        </a>
        ), órgano de control de la Ley 25.326, atiende las denuncias y reclamos
        por incumplimiento de las normas de protección de datos personales.
      </p>

      <h2>10. Menores de edad</h2>
      <p>La app no está dirigida a menores de 18 años.</p>

      <h2>11. Cambios en esta política</h2>
      <p>
        Si esta política cambia, se actualiza la fecha de arriba. Su uso también
        se rige por los <Link to="/terminos">Términos y condiciones</Link>.
      </p>
    </LegalPage>
  );
}
