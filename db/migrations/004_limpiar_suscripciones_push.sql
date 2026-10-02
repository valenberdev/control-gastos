-- Borra las suscripciones push cuyo endpoint no pertenece a un servicio de
-- notificaciones de navegadores (la API ahora solo acepta esos hosts por HTTPS).
-- Si una persona pierde su suscripción por error, vuelve a activar las
-- notificaciones desde la app. Es de una sola vez: la base nueva no lo necesita.
BEGIN;

DELETE FROM push_subscriptions
WHERE length(endpoint) > 2048
   OR endpoint !~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/';

COMMIT;
