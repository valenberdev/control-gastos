# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Uso personal y de gente cercana (el dueño del proyecto, familia, amigos), cada quien con su propia cuenta. Registran gastos e ingresos en el día a día, sobre todo desde el celular, y revisan cómo vienen en el mes. No es un producto lanzado al público general.

## Product Purpose
Control personal de ingresos y gastos por categoría. El éxito es que cargar un movimiento cueste segundos y que abrir la app responda de un vistazo a "¿cómo voy este mes?".

## Positioning
La carga no depende de abrir la app: se escribe un mensaje al bot de Telegram (por ejemplo "uber 3500") y el gasto queda registrado y categorizado, y la PWA instalada en el celular avisa por notificaciones push. No se conecta a bancos ni a terceros; el usuario carga sus propios datos.

## Operating Context
- Tres piezas en un monorepo: PWA web (React 19, Vite, Recharts, react-router), API (Express + PostgreSQL) y bot de Telegram (grammY).
- Cada movimiento tiene origen `web` o `telegram`. El bot solo responde en chats privados y se vincula a una cuenta con un código de enlace.
- Despliegue: web en Vercel, API y bot en Render, base Postgres en Supabase; local con docker-compose.
- Montos en pesos argentinos (`es-AR`, ARS); zona horaria por usuario, por defecto `America/Argentina/Buenos_Aires`.

## Capabilities and Constraints
- Registro y consulta de gastos (con categoría) e ingresos; balance, tendencia por período, distribución por categoría, historial, perfil con zona horaria.
- Categorías fijas: comida, transporte, entretenimiento, salud, servicios, otros. Existen presupuesto mensual por categoría y gastos recurrentes en el esquema de datos.
- Idioma de la interfaz y del bot: español rioplatense.
- Mobile-first: el uso principal es en el celular; escritorio es secundario. Instalable como PWA con service worker y push.
- Tema claro y oscuro, ya soportados (`ThemeToggle`) y a mantener.

## Evidence on Hand
Hay una app funcional y desplegada. No hay testimonios, métricas de uso ni base de usuarios externos; no inventar ninguno.

## Product Principles
1. Cargar rápido antes que cargar completo: cada campo extra en un movimiento tiene que ganarse su lugar.
2. El estado del mes se entiende de un vistazo, sin navegar.
3. La app y el bot son dos puertas al mismo dato; ninguna se siente de segunda.
4. Datos propios, ingresados a mano: sin conexiones bancarias ni promesas de automatización que el producto no cumple.
5. Lenguaje cotidiano argentino, sin jerga financiera.

## Accessibility & Inclusion
No se estableció un estándar formal. Mantener contraste legible en ambos temas y objetivos táctiles cómodos para uso a una mano en celular.
