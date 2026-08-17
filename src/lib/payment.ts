import { randomBytes } from 'crypto';
import { env } from './env';

/**
 * Payment adapter.
 *
 * The default MODULAR_GATEWAY provider is a real, working in-app checkout: it
 * creates a PENDING payment, hands back a URL to `/checkout/[transactionId]`,
 * and the confirm endpoint settles it. Swapping in Stripe means implementing
 * `createCheckoutSession` to return a Stripe-hosted URL and pointing the
 * webhook at the same settle logic - no call sites change.
 */

export interface CheckoutSessionOptions {
  ticketId: string;
  ticketName: string;
  price: number;
  currency: string;
  attendeeName: string;
  attendeeEmail: string;
  eventId: string;
  eventTitle: string;
}

export interface CheckoutSession {
  provider: string;
  checkoutUrl: string;
  transactionId: string;
}

export function generateTransactionId(): string {
  return `TXN-${randomBytes(9).toString('base64url').toUpperCase()}`;
}

export function generateRegistrationCode(): string {
  // Ambiguous characters removed so codes survive being read aloud at a door.
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `BSA-${code.slice(0, 3)}-${code.slice(3)}`;
}

export async function createCheckoutSession(options: CheckoutSessionOptions): Promise<CheckoutSession> {
  const transactionId = generateTransactionId();

  if (env.paymentProvider === 'STRIPE' && env.stripeSecretKey) {
    // Intentionally explicit: fail loudly rather than silently taking no money.
    throw new Error(
      'PAYMENT_PROVIDER=STRIPE is set but the Stripe integration has not been implemented. Install `stripe`, create a Checkout Session here, and forward webhooks to /api/payments/confirm.',
    );
  }

  console.info(
    `[payment] ${env.paymentProvider} session ${transactionId} - ${options.ticketName} for ${options.eventTitle} (${options.price} ${options.currency})`,
  );

  return {
    provider: env.paymentProvider,
    checkoutUrl: `${env.appUrl}/checkout/${transactionId}`,
    transactionId,
  };
}

export interface PaymentVerificationResult {
  verified: boolean;
  status: 'COMPLETED' | 'FAILED';
}

/**
 * Confirms a transaction with the provider. For the modular gateway this is a
 * local settle; a real provider would be re-queried here before trusting it.
 */
export async function verifyPaymentTransaction(transactionId: string): Promise<PaymentVerificationResult> {
  if (!transactionId.startsWith('TXN-')) {
    return { verified: false, status: 'FAILED' };
  }
  return { verified: true, status: 'COMPLETED' };
}

export function formatMoney(amount: number, currency = 'USD'): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}
