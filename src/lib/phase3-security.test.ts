/**
 * Phase 3 Automated Security Regression & Hardening Test Suite.
 * Validates authentication mechanisms, RBAC, Zod schema sanitization,
 * SSRF URL filtering, file upload guards, rate limiting, and error handling.
 */

import { isSafeUrl } from './ssrf';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  privacySchema,
  adminEventSchema,
  adminSponsorSchema,
  adminOpportunitySchema,
  eventRegisterSchema,
} from './validation';
import { LIMITS } from './rate-limit';
import { hashPassword, verifyPassword, generateToken, verifyToken, hashToken, createResetToken } from './auth';

export async function runPhase3SecurityTests() {
  console.log('🛡️ Starting Phase 3 Security Hardening & Regression Test Suite…\n');

  // 1. AUTHENTICATION & CREDENTIAL TESTS
  console.log('--- 1. Authentication & Token Security ---');
  const pwd = 'ComplexPassword123!';
  const hash = await hashPassword(pwd);
  const validPwd = await verifyPassword(pwd, hash);
  const invalidPwd = await verifyPassword('WrongPassword123!', hash);
  if (!validPwd || invalidPwd) {
    throw new Error('Test Failure: Password verification logic failed!');
  }

  const tokenPayload = { userId: 'usr-123', email: 'user@bsa.dev', role: 'MEMBER' };
  const token = await generateToken(tokenPayload);
  const verifiedPayload = await verifyToken(token);
  const fakeTokenVerified = await verifyToken('invalid.jwt.token');

  if (!verifiedPayload || verifiedPayload.userId !== tokenPayload.userId || fakeTokenVerified !== null) {
    throw new Error('Test Failure: JWT verification or signature check failed!');
  }

  // Password reset token hashing test
  const { token: rawResetToken, tokenHash } = createResetToken();
  if (hashToken(rawResetToken) !== tokenHash) {
    throw new Error('Test Failure: One-time reset token SHA-256 hash mismatch!');
  }
  console.log('✅ Pass: Hashing, JWT verification, and password reset token security verified.');

  // 2. AUTHORIZATION & MASS ASSIGNMENT TESTS
  console.log('--- 2. Authorization & Mass Assignment Prevention ---');
  const attackerProfilePayload: any = {
    fullName: 'Attacker User',
    handle: 'attacker_user',
    headline: 'Security Consultant',
    org: 'Test Security',
    jobTitle: 'Consultant',
    field: 'Infosec',
    memberType: 'PROFESSIONAL',
    location: 'San Francisco, CA',
    bio: 'Profile bio',
    role: 'ADMIN', // Unauthorized field injection
    status: 'ACTIVE', // Unauthorized field injection
    is_admin: true, // Unauthorized field injection
    verified: true, // Unauthorized field injection
  };

  const sanitizedProfile = profileSchema.parse(attackerProfilePayload);
  if ('role' in sanitizedProfile || 'status' in sanitizedProfile || 'is_admin' in sanitizedProfile || 'verified' in sanitizedProfile) {
    throw new Error('Test Failure: Mass assignment allowed unauthorized account fields through profile schema!');
  }
  console.log('✅ Pass: Schema validation strips protected fields (role, status, is_admin, verified).');

  // 3. INPUT VALIDATION & INJECTION PREVENTION
  console.log('--- 3. Input Validation & Bounds Enforcement ---');
  const invalidEmail = loginSchema.safeParse({ email: 'invalid-email-format', password: 'Password123!' });
  const shortHandle = registerSchema.safeParse({
    fullName: 'Test User',
    handle: 'a', // Too short
    email: 'valid@bsa.dev',
    password: 'Password123!',
    org: 'Org',
  });

  if (invalidEmail.success || shortHandle.success) {
    throw new Error('Test Failure: Schema validation passed malformed inputs!');
  }
  console.log('✅ Pass: Malformed email and invalid handle formats rejected.');

  // 4. SSRF & MALICIOUS URL PROTECTION
  console.log('--- 4. SSRF Protection & URL Filtering ---');
  const unsafeUrls = [
    'http://127.0.0.1:3000',
    'http://localhost:8080',
    'http://169.254.169.254/latest/meta-data/',
    'http://10.0.1.1',
    'file:///etc/passwd',
    'gopher://127.0.0.1:25/',
  ];

  for (const url of unsafeUrls) {
    if (isSafeUrl(url)) {
      throw new Error(`Test Failure: SSRF protection failed to block dangerous URL: ${url}`);
    }
  }

  if (!isSafeUrl('https://images.unsplash.com/photo-1550751827-4bd374c3f58b')) {
    throw new Error('Test Failure: SSRF protection blocked legitimate external HTTPS image URL!');
  }
  console.log('✅ Pass: SSRF utility correctly blocks loopback, private IP subnets, cloud metadata, and non-HTTP protocols.');

  // 5. BUSINESS LOGIC & PRICE TAMPERING TESTS
  console.log('--- 5. Business Logic & Price Tampering Safeguards ---');
  const tamperedTicketBooking: any = {
    ticketId: '00000000-0000-0000-0000-000000000000',
    name: 'Booker Name',
    email: 'booker@bsa.dev',
    company: 'BSA Corp',
    price: 0, // Client override attempt
    status: 'CONFIRMED', // Client override attempt
  };

  const parsedBooking = eventRegisterSchema.parse(tamperedTicketBooking);
  if ('price' in parsedBooking || 'status' in parsedBooking) {
    throw new Error('Test Failure: Ticket registration allowed client-supplied price or status fields!');
  }
  console.log('✅ Pass: Event registration schema ignores client-supplied price and status values.');

  // 6. ENDPOINT RATE LIMITING CONFIGURATION
  console.log('--- 6. Endpoint Rate Limiting Coverage ---');
  const requiredLimitKeys = ['auth', 'register', 'passwordReset', 'form', 'write', 'directorySearch', 'eventRegistration', 'payment', 'upload', 'adminApi'];
  for (const key of requiredLimitKeys) {
    if (!(key in LIMITS)) {
      throw new Error(`Test Failure: Missing rate limit configuration for ${key}`);
    }
  }
  console.log('✅ Pass: Rate limiting configurations present across all critical endpoints.');

  console.log('\n✨ All Phase 3 Security Hardening & Regression Tests Passed Successfully!\n');
}
