import { z } from 'zod';

/** Shared primitives */
const email = z.string().trim().toLowerCase().email('That does not look like an email address.').max(160);

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'That password is too long.')
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9]/.test(v), 'Mix in at least one letter and one number.');

const handle = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Handles need at least 3 characters.')
  .max(20, 'Handles max out at 20 characters.')
  .regex(/^[a-z0-9_]+$/, 'Letters, numbers and underscores only.');

const url = z.string().trim().url('Needs to be a full URL (https://…).').max(1000);
const optionalUrl = z
  .union([url, z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

/** Flexible Image URL schema supporting HTTP, HTTPS, relative paths (/media/...), and base64 Data URLs of any size. */
const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => !v || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/') || v.startsWith('data:image/'),
    'Needs to be a valid image URL (http://, https://, /media/..., or uploaded base64 data image).',
  );

const optionalImageUrl = z
  .union([imageUrlSchema, z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

const shortText = z.string().trim().min(1, 'Required.').max(120);
const mediumText = z.string().trim().min(1, 'Required.').max(300);
const longText = z.string().trim().max(4000);

export const MEMBER_TYPES = ['PROFESSIONAL', 'LEADER', 'CONSULTANT', 'VENDOR', 'ORGANISATION'] as const;
export const EVENT_CATEGORIES = ['CONFERENCE', 'WORKSHOP', 'ROUNDTABLE', 'WEBINAR', 'NETWORKING', 'SUMMIT'] as const;
export const OPPORTUNITY_TYPES = ['ROLE', 'PARTNERSHIP', 'RFP', 'SPEAKING', 'BOARD_POSITION'] as const;
export const RESOURCE_LEVELS = ['FOUNDATION', 'PRACTITIONER', 'EXECUTIVE'] as const;
export const LOCATION_TYPES = ['REMOTE', 'HYBRID', 'ONSITE'] as const;
export const FORM_TYPES = [
  'CONTACT',
  'MEMBERSHIP_INQUIRY',
  'SPONSOR_INQUIRY',
  'EVENT_LEAD',
  'CHAPTER_REQUEST',
  'PARTNERSHIP_INQUIRY',
] as const;

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Tell us your name.').max(80),
  handle: handle.optional(),
  email,
  password,
  org: z.string().trim().min(2, 'Tell us your organisation.').max(100),
  jobTitle: z.string().trim().max(120).optional(),
  headline: z.string().trim().max(120).optional(),
  memberType: z.enum(MEMBER_TYPES).default('PROFESSIONAL'),
  field: z.string().trim().max(60).optional(),
  location: z.string().trim().max(100).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(128),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(20, 'That reset link is not valid.').max(200, 'That reset link is not valid.'),
  password,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(128),
  newPassword: password,
});

/* -------------------------------------------------------------------------- */
/* Member                                                                      */
/* -------------------------------------------------------------------------- */

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  handle,
  headline: z.string().trim().max(120),
  org: z.string().trim().min(1).max(100),
  jobTitle: z.string().trim().max(120),
  field: z.string().trim().max(60),
  memberType: z.enum(MEMBER_TYPES),
  location: z.string().trim().max(100),
  bio: z.string().trim().max(900),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  contactEmail: z.string().trim().email('Enter a valid email address.').max(120).optional().nullable(),
  avatarUrl: optionalImageUrl,
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
  specialties: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  skills: z.array(z.string().trim().min(1).max(40)).max(16).default([]),
  openToOpportunities: z.boolean().default(false),
  openToMentoring: z.boolean().default(false),
  openToSpeaking: z.boolean().default(false),
});

export const privacySchema = z.object({
  isPublic: z.boolean(),
  searchableInDirectory: z.boolean(),
  showEmail: z.boolean(),
  showPhone: z.boolean(),
  showOrg: z.boolean(),
  showLinkedIn: z.boolean(),
  showWebsite: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Platform actions                                                            */
/* -------------------------------------------------------------------------- */

export const moduleCompleteSchema = z.object({
  moduleId: z.string().uuid('Unknown module.'),
});

export const applicationSchema = z.object({
  name: z.string().trim().min(2, 'Your name, please.').max(80),
  email,
  org: z.string().trim().max(100).optional(),
  profileUrl: optionalUrl,
  experience: z.string().trim().max(100).optional(),
  note: z.string().trim().max(2000).optional(),
  opportunityId: z.string().uuid('Unknown opportunity.'),
});

export const eventRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email,
  org: z.string().trim().max(100).optional(),
  company: z.string().trim().max(100).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  ticketType: z.string().trim().default('MEMBER'),
  ticketId: z.string().optional(),
});

export const formSubmissionSchema = z.object({
  formType: z.enum(FORM_TYPES),
  name: z.string().trim().min(2, 'Tell us your name.').max(80),
  email,
  company: z.string().trim().max(100).optional(),
  jobTitle: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  message: z.string().trim().min(5, 'Say a little more so we can help.').max(4000),
  source: z.string().trim().max(100).optional(),
  campaign: z.string().trim().max(100).optional(),
  website: z.string().optional(),
});

export const chapterJoinSchema = z.object({
  chapterId: z.string().uuid('Unknown chapter.'),
});

/* -------------------------------------------------------------------------- */
/* Admin                                                                       */
/* -------------------------------------------------------------------------- */

export const adminEventSchema = z.object({
  title: shortText,
  description: mediumText,
  fullDetails: z.string().trim().min(1, 'Required.').max(20_000),
  category: z.enum(EVENT_CATEGORIES).default('NETWORKING'),
  location: shortText.default('Online / Virtual'),
  locationType: z.enum(['IN_PERSON', 'VIRTUAL', 'HYBRID']).default('VIRTUAL'),
  venueName: z.string().trim().max(120).optional().nullable(),
  eventDate: z.coerce.date(),
  startTime: z.string().trim().max(20).default('09:00 AM'),
  endTime: z.string().trim().max(20).default('05:00 PM'),
  maxCapacity: z.coerce.number().int().min(1).max(100_000).default(120),
  heroImageUrl: optionalImageUrl,
  cpdHours: z.coerce.number().int().min(0).max(100).default(0),
  status: z.enum(['UPCOMING', 'LIVE', 'COMPLETED', 'DRAFT']).default('UPCOMING'),
  ticketName: z.string().trim().max(60).default('Member Registration'),
  ticketPrice: z.coerce.number().min(0).max(100_000).default(0),
});

export const adminSponsorSchema = z.object({
  name: shortText,
  logoUrl: imageUrlSchema.default('/images/sponsor-placeholder.png'),
  tier: z.enum(['DIAMOND', 'GOLD', 'SILVER', 'COMMUNITY']).default('GOLD'),
  description: mediumText,
  websiteUrl: z.string().trim().min(1).default('https://bsa.dev'),
  ctaText: z.string().trim().max(40).optional(),
  ctaUrl: optionalUrl,
  isHiring: z.boolean().default(false),
  perkText: z.string().trim().max(160).optional(),
  isPublished: z.boolean().default(true),
});

export const adminPostSchema = z.object({
  title: shortText,
  summary: mediumText,
  content: z.string().trim().min(1, 'Required.').max(40_000),
  category: z.string().trim().max(60).default('Industry Insight'),
  tags: z.array(z.string().trim().min(1).max(24)).max(8).default([]),
  imageUrl: optionalImageUrl,
  authorName: shortText,
  authorTitle: z.string().trim().max(120).default('BSA Crew'),
  authorAvatar: optionalImageUrl,
  readTimeMinutes: z.coerce.number().int().min(1).max(120).default(5),
  isFeatured: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

export const adminOpportunitySchema = z.object({
  title: shortText,
  org: shortText,
  logoUrl: optionalImageUrl,
  coverImageUrl: optionalImageUrl,
  type: z.enum(OPPORTUNITY_TYPES).default('ROLE'),
  locationType: z.enum(LOCATION_TYPES).default('REMOTE'),
  location: shortText,
  compensation: z.string().trim().max(80).optional(),
  description: z.string().trim().min(1, 'Required.').max(4000),
  requirements: z.array(z.string().trim().min(1).max(120)).max(12).default([]),
  applyUrl: optionalUrl,
  deadline: z.coerce.date().optional().nullable(),
  isPublished: z.boolean().default(true),
});

export const adminResourceSchema = z.object({
  title: shortText,
  summary: mediumText,
  description: z.string().trim().min(1, 'Required.').max(8000),
  level: z.enum(RESOURCE_LEVELS).default('FOUNDATION'),
  emoji: z.string().trim().max(8).default(''),
  accent: z.enum(['lime', 'magenta', 'violet', 'tangerine']).default('lime'),
  estHours: z.coerce.number().int().min(1).max(200).default(4),
  isPublished: z.boolean().default(true),
});

export const adminMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['MEMBER', 'ADMIN']),
});

export const adminMemberStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'PENDING', 'REVOKED']),
});

export const adminLeadHandledSchema = z.object({
  id: z.string().uuid(),
  isHandled: z.boolean(),
});

/* -------------------------------------------------------------------------- */
/* Community chat                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Attachments are stored inline as base64 data URLs, so the length cap is what
 * stops one message from writing a multi-megabyte row on every send.
 */
const chatImageUrl = z
  .union([imageUrlSchema.max(1_500_000, 'That image is too large - upload a smaller one.'), z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const chatSendSchema = z
  .object({
    channel: z.string().trim().max(40).optional().nullable(),
    recipientId: z.string().trim().max(64).optional().nullable(),
    content: z.string().trim().max(4000, 'Messages max out at 4,000 characters.').default(''),
    imageUrl: chatImageUrl,
  })
  .refine((v) => v.content.length > 0 || Boolean(v.imageUrl), {
    message: 'Type a message or attach an image first.',
    path: ['content'],
  });

/* -------------------------------------------------------------------------- */
/* PATCH schemas                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Build the PATCH counterpart of a create schema: every key optional, and only
 * the keys the client actually sent survive parsing.
 *
 * `schema.partial()` alone is NOT enough — Zod keeps each field's `.default()`
 * inside the optional wrapper, so an absent key parses to its default and then
 * overwrites the stored row. That is why saving a capacity edit also reset
 * ticketPrice to 0, status to UPCOMING, cpdHours to 0, and so on. Strip the
 * defaults first, then make the field optional.
 */
export function patchable<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      const f = field as z.ZodTypeAny & { def: { type: string; innerType?: z.ZodTypeAny } };
      return [key, (f.def.type === 'default' ? f.def.innerType! : f).optional()];
    }),
  ) as unknown as { [K in keyof T]: z.ZodOptional<T[K] extends z.ZodDefault<infer I> ? I : T[K]> };

  return z.object(shape);
}
