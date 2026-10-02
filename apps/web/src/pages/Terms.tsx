import { Link } from "react-router";
import LegalPage from "../components/LegalPage";

const LINKEDIN_URL = "https://www.linkedin.com/in/valenberdini/";
const REPO_URL = "https://github.com/valenberdev/control-gastos";

export default function Terms() {
  return (
    <LegalPage title="Términos y condiciones" updated="1 de octubre de 2026">
      <p>
        Al crear una cuenta o usar Control de Gastos aceptás estos términos. Si
        no estás de acuerdo, no uses la app.
      </p>

      <h2>1. Qué es este servicio</h2>
      <p>
        Control de Gastos es un proyecto personal y gratuito de Valentino
        Berdini para registrar gastos e ingresos, desde la web o desde un chat
        de Telegram. Es un proyecto de portfolio, no un producto comercial.
      </p>

      <h2>2. Quién puede usarlo</h2>
      <p>
        Tenés que ser mayor de 18 años y usar un email que sea tuyo. Una cuenta
        es personal y no se puede compartir.
      </p>

      <h2>3. Tu cuenta</h2>
      <p>
        Sos responsable de cuidar tu contraseña y de lo que se haga con tu
        cuenta. Podés eliminarla en cualquier momento desde{" "}
        <Link to="/perfil">Perfil</Link>.
      </p>

      <h2>4. Uso aceptable</h2>
      <p>No está permitido:</p>
      <ul>
        <li>intentar acceder a cuentas o datos de otras personas;</li>
        <li>
          atacar, sobrecargar o intentar saltear los límites de seguridad del
          servicio;
        </li>
        <li>crear cuentas de forma masiva o automatizada;</li>
        <li>
          usar la app para algo ilegal o cargar contenido que infrinja derechos
          de terceros.
        </li>
      </ul>
      <p>Una cuenta que incumpla estas reglas puede ser eliminada.</p>

      <h2>5. Tus datos</h2>
      <p>
        Los datos que cargás son tuyos. Nos das el permiso necesario para
        guardarlos y procesarlos con el único fin de prestarte el servicio, como
        se explica en la <Link to="/privacidad">Política de privacidad</Link>.
      </p>

      <h2>6. Disponibilidad y sin garantías</h2>
      <p>
        El servicio se ofrece «tal cual», sin garantías de ningún tipo. Corre
        sobre planes gratuitos de terceros: puede tardar cerca de un minuto en
        responder después de un rato sin uso, tener interrupciones o perder
        funcionalidades. No hay copias de respaldo garantizadas, así que no uses
        la app como único registro de información importante.
      </p>

      <h2>7. No es asesoramiento financiero</h2>
      <p>
        La app muestra números a partir de lo que cargás vos. No brinda
        asesoramiento financiero, contable ni impositivo, y no verifica que lo
        cargado sea correcto.
      </p>

      <h2>8. Servicios de terceros</h2>
      <p>
        El bot usa Telegram y las notificaciones usan el servicio de tu
        navegador. Esos servicios se rigen por sus propios términos, que no
        controlo.
      </p>

      <h2>9. Código abierto</h2>
      <p>
        El código de la app es público en{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          GitHub
        </a>{" "}
        con licencia MIT. Estos términos regulan el uso del servicio alojado, no
        el uso del código.
      </p>

      <h2>10. Limitación de responsabilidad</h2>
      <p>
        En la medida en que la ley lo permita, no me hago responsable por
        pérdidas o daños derivados del uso de la app, de la pérdida de datos o
        de la falta de disponibilidad del servicio.
      </p>

      <h2>11. Cambios y cierre del servicio</h2>
      <p>
        Puedo modificar estos términos, cambiar el servicio o cerrarlo. Voy a
        intentar avisar con anticipación cuando sea posible. Seguir usando la
        app después de un cambio implica aceptarlo.
      </p>

      <h2>12. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de la República Argentina.</p>

      <h2>13. Contacto</h2>
      <p>
        Podés escribir por{" "}
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
          LinkedIn
        </a>
        .
      </p>
    </LegalPage>
  );
}
