
BEGIN;

DELETE FROM push_subscriptions
WHERE length(endpoint) > 2048
   OR endpoint !~* '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/';

COMMIT;
