-- Versión de sesión: el JWT lleva la versión vigente y la API la compara en cada
-- pedido. Subirla (al restablecer la contraseña) invalida todas las sesiones
-- anteriores. Las sesiones ya emitidas, que no traen versión, cuentan como 0.
-- Aplicar ANTES de desplegar la versión de la API que lee esta columna.
BEGIN;

ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

COMMIT;
