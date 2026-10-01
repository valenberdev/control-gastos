import webpush from 'web-push';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Falta TEST_DATABASE_URL (la base de prueba).');
}

const vapid = webpush.generateVAPIDKeys();

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'secreto-solo-para-tests';
process.env.INTERNAL_API_KEY = 'clave-interna-solo-para-tests';
process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.RESEND_API_KEY = 'test';
process.env.RATE_LIMIT_DISABLED = 'true';