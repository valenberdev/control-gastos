BEGIN;

-- 1) Emails siempre en minúsculas, garantizado por la base.
UPDATE users SET email = lower(email);
ALTER TABLE users ADD CONSTRAINT users_email_lowercase CHECK (email = lower(email));

-- 2) Tokens de recuperación de contraseña. Se guarda solo el hash, nunca el token.
CREATE TABLE password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_resets_user ON password_resets (user_id);

COMMIT;