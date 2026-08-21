/**
 * Account Brute-Force Lockout Defense.
 * Locks authentication for 15 minutes after 5 failed password attempts in 10 minutes.
 */

interface FailureRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 10 * 60_000; // 10 minutes
const LOCKOUT_MS = 15 * 60_000; // 15 minutes lockout

const failedLogins = new Map<string, FailureRecord>();

function cleanKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Check if account login is currently locked due to brute-force attempts. */
export function checkLockout(email: string): { locked: boolean; retryAfterMinutes: number } {
  const key = cleanKey(email);
  const record = failedLogins.get(key);
  if (!record) return { locked: false, retryAfterMinutes: 0 };

  const now = Date.now();

  // If locked, verify if lockout period has expired
  if (record.lockedUntil) {
    if (now < record.lockedUntil) {
      const remainingMs = record.lockedUntil - now;
      const retryAfterMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
      return { locked: true, retryAfterMinutes };
    }
    // Lockout expired -> reset record
    failedLogins.delete(key);
    return { locked: false, retryAfterMinutes: 0 };
  }

  // If window expired without locking, clear old attempts
  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedLogins.delete(key);
    return { locked: false, retryAfterMinutes: 0 };
  }

  return { locked: false, retryAfterMinutes: 0 };
}

/** Record a failed login attempt for an email address. */
export function recordFailedAttempt(email: string): { attempts: number; lockedNow: boolean; retryAfterMinutes: number } {
  const key = cleanKey(email);
  const now = Date.now();
  const existing = failedLogins.get(key);

  if (!existing || now - existing.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedLogins.set(key, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    });
    return { attempts: 1, lockedNow: false, retryAfterMinutes: 0 };
  }

  existing.attempts += 1;

  if (existing.attempts >= MAX_ATTEMPTS) {
    existing.lockedUntil = now + LOCKOUT_MS;
    return { attempts: existing.attempts, lockedNow: true, retryAfterMinutes: 15 };
  }

  return { attempts: existing.attempts, lockedNow: false, retryAfterMinutes: 0 };
}

/** Reset failed attempt counters on successful sign-in. */
export function resetFailedAttempts(email: string): void {
  const key = cleanKey(email);
  failedLogins.delete(key);
}
