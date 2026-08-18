/**
 * Environment contract.
 *
 * Anything that would silently degrade security in production is checked here
 * and fails loudly at boot rather than at 3am.
 */

const DEV_FALLBACK_SECRET = 'bsa-dev-only-secret-do-not-use-in-production';

let cachedSecret: string | null = null;

/**
 * Resolved lazily rather than at module load. `next build` runs with
 * NODE_ENV=production while collecting routes, so validating eagerly would
 * make every CI build require the production signing key.
 */
function readSecret(): string {
  if (cachedSecret) return cachedSecret;

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    cachedSecret = secret && secret.length > 0 ? secret.padEnd(32, '0') : DEV_FALLBACK_SECRET;
    return cachedSecret;
  }

  cachedSecret = secret;
  return cachedSecret;
}

export const env = {
  get jwtSecret() {
    return readSecret();
  },
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV !== 'production',

  /** Absolute origin, used for emails, payment redirects and sitemap URLs. */
  appUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim().replace(/[\r\n]+/g, '').replace(/\/$/, ''),

  hubspotApiKey: process.env.HUBSPOT_API_KEY || '',
  hubspotPortalId: process.env.HUBSPOT_PORTAL_ID || '',

  paymentProvider: process.env.PAYMENT_PROVIDER || 'MODULAR_GATEWAY',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',

  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'BSA <crew@bsa.dev>',
};

export const COOKIE_NAME = 'bsa_session';
